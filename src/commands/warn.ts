import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import modPermsCheck from '../preconditions/modPermsCheck';
import validProof from '../preconditions/validProof';
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import {
    addModLog,
    addProof,
    basicEmbed,
    boolDb,
    codeBox,
    confirm,
    displayDate,
    evokerColor,
    modFields,
    numerize,
    pagination,
    pingUser,
    plurial,
    resizeString,
    subcmd
} from '../utils/toolbox';
import query from '../utils/query';
import { modlogs } from '../typings/database';
import { util } from '../utils/functions';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export default new AmethystCommand({
    name: 'avertissement',
    description: "Gère les avertissements d'un membre",
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    permissions: ['ManageGuild'],
    options: [
        {
            name: 'liste',
            description: "Affiche la liste des avertissements d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre dont vous voulez voir les avertissements',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: 'ajouter',
            description: 'Ajoute un avertissement à une personne',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre à qui vous voulez ajouter un avertissement',
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'raison',
                    description: "Raison de l'avertissement",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    description: 'Preuve de votre agissement',
                    type: ApplicationCommandOptionType.Attachment,
                    required: false
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un avertissement',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre dont vous voulez retirer un evertissement',
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'identifiant',
                    description: "Identifiant de l'avertissement que vous voulez retirer",
                    required: true,
                    type: ApplicationCommandOptionType.Integer
                },
                {
                    name: 'raison',
                    description: "Raison de la suppression d'avertissement",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    description: 'Preuve de votre agissement',
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'liste') {
        const user = options.getUser('membre');
        await interaction.deferReply();

        const warns = await query<modlogs>(
            `SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND member_id='${
                user.id
            }' AND type='Warn' AND deleted='${boolDb(false)}'`
        );

        if (!warns || warns.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle("Pas d'avertissements")
                            .setDescription(`${user} n'a aucun avertissement`)
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Avertissements')
                .setDescription(`${user} a ${numerize(warns.length)} avertissement${plurial(warns.length)}`);
        };
        const map = (embed: EmbedBuilder, warn: modlogs) => {
            return embed.addFields({
                name: resizeString({ str: warn.reason, length: 60 }),
                value: `Par ${pingUser(warn.mod_id)} ( \`${warn.mod_id}\` ) ${displayDate(
                    parseInt(warn.date)
                )}\n> Identifiant: \`${warn.case_id}\``,
                inline: false
            });
        };

        if (warns.length <= 5) {
            const embed = basic();
            for (const warn of warns) {
                map(embed, warn);
            }

            interaction
                .editReply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds = [basic()];

            warns.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                map(embeds[embeds.length - 1], v);
            });

            pagination({
                interaction,
                user: interaction.user,
                embeds
            });
        }
    }
    if (cmd === 'ajouter') {
        const reason = options.getString('raison');
        const user = options.getUser('membre');
        const proof = options.getAttachment(util('proofName'));

        if (user.bot)
            return interaction
                .reply({
                    embeds: [
                        replies.memberBot(interaction.user, { member: options.getMember('membre') as GuildMember })
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        const valid = (await confirm({
            embed: addProof(
                basicEmbed(interaction.user)
                    .setTitle('Avertissement')
                    .setDescription(
                        `Vous êtes sur le point d'avertir ${user} pour la raison :\n${codeBox(
                            reason
                        )}\nVoulez-vous continuer ?`
                    ),
                proof
            ),
            user: interaction.user,
            interaction
        }).catch(() => {})) as confirmReturn;

        if (valid === 'cancel' || !valid?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                reason,
                proof: proof?.url,
                mod_id: interaction.user.id,
                member_id: user.id,
                type: 'Warn'
            }).catch(() => {}),
            user
                .send({
                    embeds: [
                        addProof(
                            basicEmbed(interaction.user)
                                .setTitle('Avertissement')
                                .setDescription(
                                    `Vous avez été avertit par ${interaction.user} sur ${
                                        interaction.guild.name
                                    } <t:${Math.floor(Date.now() / 1000)}:R>`
                                )
                                .setFields({
                                    name: 'Raison',
                                    value: reason,
                                    inline: false
                                }),
                            proof
                        )
                    ]
                })
                .catch(() => {})
        ]);

        interaction.editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Avertissement')
                    .setDescription(`${user} vient de recevoir un avertissement`)
                    .setFields(
                        modFields({
                            mod: interaction.user,
                            member: user,
                            reason
                        })
                    )
            ]
        });
    }
    if (cmd === 'supprimer') {
        const user = options.getUser('membre');
        const id = options.getInteger('identifiant');
        const reason = options.getString('raison') ?? 'Pas de raison';
        const proof = options.getAttachment(util('proofName'));

        if (user.bot)
            return interaction
                .reply({
                    embeds: [
                        replies.memberBot(interaction.user, { member: options.getMember('membre') as GuildMember })
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction.deferReply().catch(() => {});
        const warns = await query<modlogs>(
            `SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND member_id='${
                user.id
            }' AND type='Warn' AND deleted='${boolDb(false)}' AND case_id="${id}"`
        );

        if (!warns || warns.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle("Pas d'avertissements")
                            .setDescription(`${user} n'a pas d'avertissement dont l'identifiant est \`${id}\``)
                    ]
                })
                .catch(() => {});

        const validation = (await confirm({
            interaction,
            user: interaction.user,
            embed: addProof(
                basicEmbed(interaction.user)
                    .setTitle("Suppression d'avertissement")
                    .setDescription(`Voulez-vous vraiment supprimer l'avertissement de ${user} ?`)
                    .setFields(
                        {
                            name: "Raison de l'avertissement",
                            value: warns[0].reason,
                            inline: false
                        },
                        {
                            name: 'Raison',
                            value: reason,
                            inline: false
                        }
                    ),
                proof
            )
        }).catch(() => {})) as confirmReturn;

        if (validation === 'cancel' || !validation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        await Promise.all([
            query(`UPDATE modlogs SET deleted='${boolDb(true)}' WHERE case_id='${warns[0].case_id}'`),
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                member_id: user.id,
                reason,
                type: 'Unwarn',
                proof: proof?.url
            }).catch(() => {}),
            user
                .send({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Avertissement supprimé')
                            .setDescription(
                                `Votre avertissement d'identifiant \`${id}\` sur ${interaction.guild.name} a été supprimé par ${interaction.user.tag}`
                            )
                    ]
                })
                .catch(() => {})
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Avertissement supprimé')
                        .setDescription(`L'avertissement \`${id}\` de ${user} a été supprimé par ${interaction.user}`)
                ]
            })
            .catch(() => {});
    }
});
