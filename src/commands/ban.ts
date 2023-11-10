import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import modPermsCheck from '../preconditions/modPermsCheck';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { reportToBender, util } from '../utils/functions';
import validProof from '../preconditions/validProof';
import { addModLog, addProof, basicEmbed, codeBox, confirm, modFields } from '../utils/toolbox';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export default new DraverCommand({
    name: 'ban',
    module: 'moderation',
    description: 'Banni un membre du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    options: [
        {
            name: 'membre',
            description: 'Membre à bannir',
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'raison',
            description: 'Raison du bannissement',
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: util('proofName'),
            description: 'Preuve de votre agissement',
            required: false,
            type: ApplicationCommandOptionType.Attachment
        }
    ],
    permissions: ['BanMembers'],
    clientPermissions: ['BanMembers']
}).setChatInputRun(async ({ interaction, options }) => {
    const member = options.getMember('membre') as GuildMember;
    const reason = options.getString('raison');
    const proof = options.getAttachment(util('proofName'));

    const confirmation = (await confirm({
        interaction,
        user: interaction.user,
        embed: addProof(
            basicEmbed(interaction.user)
                .setTitle('Expulsion')
                .setDescription(`Vous êtes sur le point **de bannir** ${member} pour la raison :\n${codeBox(reason)}`),
            proof
        )
    }).catch(() => {})) as confirmReturn;

    if (confirmation === 'cancel' || !confirmation?.value)
        return interaction
            .editReply({
                embeds: [replies.cancel()],
                components: []
            })
            .catch(() => {});
    await interaction
        .editReply({
            embeds: [replies.wait(interaction.user)],
            components: []
        })
        .catch(() => {});
    await member
        .send({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Bannissement')
                    .setDescription(
                        `Vous avez été banni de ${interaction.guild.name} par ${interaction.user.tag} <t:${Math.floor(
                            Date.now() / 1000
                        )}:R> pour la raison :\n${codeBox(reason)}`
                    )
            ]
        })
        .catch(() => {});

    await Promise.all([
        member.ban().catch(() => {}),
        addModLog({
            guild: interaction.guild,
            member_id: member.id,
            mod_id: interaction.user.id,
            type: 'Ban',
            reason,
            proof: proof?.url
        }),
        reportToBender({
            type: 'Ban',
            guild: interaction.guild.id,
            user: interaction.user.id,
            data: {
                member: member.id
            }
        })
    ]);
    interaction
        .editReply({
            embeds: [
                addProof(
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Bannissement')
                        .setDescription(`${member.user.tag} a été banni du serveur`)
                        .setFields(modFields({ mod: interaction.user, member: member.user, reason })),
                    proof
                )
            ]
        })
        .catch(() => {});
});
