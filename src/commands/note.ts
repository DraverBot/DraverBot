import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import modPermsCheck from '../preconditions/modPermsCheck';
import validProof from '../preconditions/validProof';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { util } from '../utils/functions';
import {
    addModLog,
    addProof,
    basicEmbed,
    buildButton,
    codeBox,
    evokerColor,
    modFields,
    row,
    sqliseString,
    subcmd
} from '../utils/toolbox';
import { DatabaseTables } from '../typings/database';
import query from '../utils/query';
import { ButtonIds } from '../typings/buttons';

export default new AmethystCommand({
    name: 'note',
    description: 'Ajoute une note à un membre',
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    permissions: ['ManageGuild'],
    options: [
        {
            name: 'ajouter',
            description: 'Ajoute une note à un membre',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre à qui vous voulez ajouter la note',
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'note',
                    description: 'Note que vous voulez appliquer au membre',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    description: 'Preuve de votre note',
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                },
                {
                    name: 'raison',
                    description: 'Raison de la note',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'supprimer',
            description: "Supprime la note d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre à qui vous voulez supprimer la note',
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'raison',
                    description: 'Raison de la suppression',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    required: false,
                    description: 'Preuve de la suppression de la note',
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            name: 'lire',
            description: "Lis la note d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre dont vous voulez lire la note',
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'lire') {
        const user = options.getUser('membre');
        await interaction.deferReply().catch(() => {});

        const notes = await query<{ note: string }>(
            `SELECT note FROM ${DatabaseTables.Notes} WHERE guild_id='${interaction.guild.id}' AND member_id='${user.id}'`
        );
        if (notes.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setDescription(`${user} n'a pas de note`)
                            .setTitle('Pas de note')
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle('Note')
                        .setDescription(`Note de ${user} :\n${codeBox(notes[0].note)}`)
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'supprimer') {
        const member = options.getMember('membre') as GuildMember;
        const reason = options.getString('raison') ?? 'Pas de raison';
        const proof = options.getAttachment(util('proofName'));

        await interaction.deferReply().catch(() => {});
        const notes = await query<{ note: string }>(
            `SELECT note FROM ${DatabaseTables.Notes} WHERE guild_id='${interaction.guild.id}' AND member_id='${member.id}'`
        );

        if (notes.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setDescription(`${member} n'a pas de note`)
                            .setTitle('Pas de note')
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await Promise.all([
            query(
                `DELETE FROM ${DatabaseTables.Notes} WHERE guild_id='${interaction.guild.id}' AND member_id='${member.id}'`
            ),
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                type: 'NoteRemoved',
                reason,
                proof: proof?.url,
                member_id: member.id
            }).catch(() => {})
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle('Note supprimée')
                        .setDescription(`La note de ${member} a été supprimée`)
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'ajouter') {
        const member = options.getMember('membre') as GuildMember;
        const reason = options.getString('raison') ?? 'Pas de raison';
        const note = options.getString('note');
        const proof = options.getAttachment(util('proofName'));

        await interaction.deferReply();
        const noteInDb = await query<{ note: string }>(
            `SELECT note FROM ${DatabaseTables.Notes} WHERE guild_id='${interaction.guild.id}' AND member_id='${member.id}'`
        );
        await Promise.all([
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                member_id: member.id,
                proof: proof?.url,
                type: noteInDb.length > 0 ? 'NoteModified' : 'NoteAdded',
                reason
            }).catch(() => {}),
            query(
                noteInDb.length > 0
                    ? `UPDATE ${DatabaseTables.Notes} SET note="${sqliseString(note)}" WHERE guild_id='${
                          interaction.guild.id
                      }' AND member_id='${member.id}'`
                    : `INSERT INTO ${DatabaseTables.Notes} ( guild_id, member_id, note ) VALUES ("${
                          interaction.guild.id
                      }", "${member.id}", "${sqliseString(note)}")`
            )
        ]);

        interaction
            .editReply({
                embeds: [
                    addProof(
                        basicEmbed(interaction.user, { defaultColor: true })
                            .setTitle(`Note ${noteInDb.length > 0 ? 'modifiée' : 'ajoutée'}`)
                            .setDescription(`La note de ${member} a été changée`)
                            .setFields(modFields({ mod: interaction.user, member: member, reason })),
                        proof
                    )
                ],
                components: [
                    row(
                        buildButton({
                            label: 'Afficher la note',
                            id: ButtonIds.DisplayNote,
                            style: 'Primary'
                        })
                    )
                ]
            })
            .catch(() => {});
    }
});
