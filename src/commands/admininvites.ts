import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, checkPerms, confirm, numerize, pingUser, plurial } from '../utils/toolbox';
import replies from '../data/replies';

export default new AmethystCommand({
    name: 'admininvitations',
    description: 'Gère les invitations du serveur',
    options: [
        {
            name: 'réinitialiser',
            type: ApplicationCommandOptionType.SubcommandGroup,
            description: 'Réinitialise les invitations',
            options: [
                {
                    name: 'serveur',
                    description: 'Réinitialise toutes les invitations du serveur',
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: 'utilisateur',
                    description: "Réinitialise toutes les invitations d'un utilisateur",
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            name: 'bonus',
            description: "Gère les bonus d'un utilisateur",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'ajouter',
                    description: 'Ajoute des invitations bonus à un membre',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'utilisateur',
                            description: 'Utilisateur auquel vous voulez rajouter des invitations',
                            required: true,
                            type: ApplicationCommandOptionType.User
                        },
                        {
                            name: 'invitations',
                            description: "Nombre d'invitations que vous voulez rajouter",
                            required: true,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        }
                    ]
                },
                {
                    name: 'retirer',
                    description: 'Retire des invitations bonus à un membre',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'utilisateur',
                            description: 'Utilisateur auquel vous voulez retirer des invitations',
                            required: true,
                            type: ApplicationCommandOptionType.User
                        },
                        {
                            name: 'invitations',
                            description: "Nombre d'invitations que vous voulez retirer",
                            required: true,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        }
                    ]
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator']
}).setChatInputRun(async ({ interaction, options, client }) => {
    if (!client.modulesManager.enabled(interaction.guild.id, 'invitations'))
        return interaction
            .reply({
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'invitations' })],
                ephemeral: true
            })
            .catch(log4js.trace);
    const cmd = options.getSubcommand();

    if (cmd === 'serveur' || cmd === 'utilisateur') {
        const user = options.getMember('utilisateur') as GuildMember;
        const resetText = cmd === 'serveur' ? 'du serveur' : `de ${pingUser(user)}`;

        if (
            cmd === 'utilisateur' &&
            !checkPerms({
                member: user,
                mod: interaction.member as GuildMember,
                checkBot: false,
                checkOwner: true,
                ownerByPass: true,
                interaction,
                sendErrorMessage: true,
                ephemeral: true,
                checkClientPosition: true,
                checkModPosition: false,
                checkSelf: false
            })
        )
            return;

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Réinitialisation')
                .setDescription(
                    `Vous êtes sur le points de réinitialiser les invitations ${resetText}.\nVoulez-vous continuer ?`
                )
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);

        if (cmd === 'serveur') {
            client.invitesManager.resetGuild(interaction.guild.id, { resetInvitations: true });
        } else {
            client.invitesManager.resetUser(interaction.guild.id, interaction.user.id, { resetInvitations: true });
        }

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Réinitialisation')
                        .setDescription(`Les invitations ${resetText} ont été réinitialisées`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd === 'ajouter' || cmd === 'retirer') {
        const user = options.getMember('utilisateur') as GuildMember;
        const amount = options.getInteger('invitations');

        if (
            !checkPerms({
                member: user,
                mod: interaction.member as GuildMember,
                checkBot: false,
                checkOwner: true,
                ownerByPass: true,
                interaction,
                sendErrorMessage: true,
                ephemeral: true,
                checkClientPosition: true,
                checkModPosition: false,
                checkSelf: false
            })
        )
            return;

        if (cmd === 'ajouter') {
            client.invitesManager.addInvites(
                interaction.guild.id,
                user.id,
                { type: 'bonus', amount },
                { type: 'total', amount }
            );
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Invitations ajoutées')
                            .setDescription(
                                `${numerize(amount)} invitation${plurial(amount, {
                                    singular: ' a été ajoutée',
                                    plurial: 's ont été ajoutées'
                                })} à ${pingUser(user)}`
                            )
                    ]
                })
                .catch(log4js.trace);
        } else {
            const quantity = Math.min(client.invitesManager.getStats(interaction.guild.id, user.id).bonus, amount) * -1;
            if (quantity === 0)
                return interaction.reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Invitations insuffisantes')
                            .setDescription(
                                `${pingUser(user)} n'a pas assez d'invitations pour pouvoir en retirer **${numerize(
                                    amount
                                )}**`
                            )
                    ]
                });

            client.invitesManager.addInvites(
                interaction.guild.id,
                user.id,
                { type: 'bonus', amount: quantity },
                { type: 'total', amount: quantity }
            );
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Invitations retirées')
                            .setDescription(
                                `**${numerize(quantity * -1)}** invitation${plurial(quantity * -1, {
                                    singular: ' a été retirée',
                                    plurial: 's ont été retirées'
                                })} à ${pingUser(user)}`
                            )
                    ]
                })
                .catch(log4js.trace);
        }
    }
});
