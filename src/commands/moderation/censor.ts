import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import modPermsCheck from '../../preconditions/modPermsCheck';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { WordGenerator } from '../../managers/Generator';
import validProof from '../../preconditions/validProof';
import { addModLog, basicEmbed, pingUser } from '../../utils/toolbox';
import { getRolePerm, reportToBender } from '../../utils/functions';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'censurer',
    module: 'moderation',
    description: "Censure le pseudo d'un membre",
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    permissions: ['ManageNicknames'],
    clientPermissions: ['ManageNicknames'],
    options: [
        {
            name: 'utilisateur',
            description: 'Membre à censurer',
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'raison',
            description: 'Raison',
            required: false,
            type: ApplicationCommandOptionType.String
        },
        {
            name: 'preuve',
            description: 'Preuve de la censure',
            required: false,
            type: ApplicationCommandOptionType.Attachment
        }
    ]
})
    .setChatInputRun(async ({ interaction, options }) => {
        const member = options.getMember('utilisateur') as GuildMember;
        const reason = options.getString('raison') ?? 'Pas de raison';
        const proof = options.getAttachment('preuve');

        if (member.id === interaction.user.id)
            return interaction
                .reply({ embeds: [replies.selfMod(interaction.member as GuildMember, {})], ephemeral: true })
                .catch(log4js.trace);

        const nick = new WordGenerator({
            length: member?.nickname?.length ?? member.user.username.length,
            capitals: false,
            letters: true,
            special: true
        }).generate();

        await interaction.deferReply().catch(log4js.trace);
        const old = member?.nickname ?? member.user.username;
        const res = await member.setNickname(nick, reason).catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de censure')
                            .setDescription(
                                `Je n'ai pas pu modifier le pseudo de ${pingUser(
                                    member
                                )}. Vérifiez que j'aie bien la permission \`${getRolePerm(
                                    'ManageNicknames'
                                )}\` et que je puisse agir sur ce membre`
                            )
                    ]
                })
                .catch(log4js.trace);

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                reason,
                proof: proof?.url,
                member_id: member.id,
                mod_id: interaction.user.id,
                type: 'Censor'
            }).catch(log4js.trace),
            reportToBender({
                type: 'Censor',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: {
                    oldName: old,
                    member: member.id
                }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Censure')
                        .setDescription(`${pingUser(member)} a été censuré`)
                ]
            })
            .catch(log4js.trace);
    })
    .setUserContextRun(async ({ interaction }) => {
        const member = interaction.targetMember as GuildMember;
        if (member.id === interaction.user.id)
            return interaction
                .reply({ embeds: [replies.selfMod(interaction.member as GuildMember, {})], ephemeral: true })
                .catch(log4js.trace);

        const nick = new WordGenerator({
            length: member?.nickname?.length ?? member.user.username.length,
            capitals: false,
            letters: true,
            special: true
        }).generate();

        await interaction.deferReply().catch(log4js.trace);

        const old = member?.nickname ?? member.user.username;
        const res = await member
            .setNickname(nick, `Pas de raison - par ${interaction.user.username} ( ${interaction.user.id} )`)
            .catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de censure')
                            .setDescription(
                                `Je n'ai pas pu modifier le pseudo de ${pingUser(
                                    member
                                )}. Vérifiez que j'aie bien la permission \`${getRolePerm(
                                    'ManageNicknames'
                                )}\` et que je puisse agir sur ce membre`
                            )
                    ]
                })
                .catch(log4js.trace);
        await Promise.all([
            addModLog({
                guild: interaction.guild,
                reason: 'Pas de raison (commande de contexte)',
                member_id: member.id,
                mod_id: interaction.user.id,
                type: 'Censor'
            }).catch(log4js.trace),
            reportToBender({
                type: 'Censor',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: {
                    oldName: old,
                    member: member.id
                }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Censure')
                        .setDescription(`${pingUser(member)} a été censuré`)
                ]
            })
            .catch(log4js.trace);
    });
