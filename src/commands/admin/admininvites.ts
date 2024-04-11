import { modulesManager, invitesManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, checkPerms, confirm, numerize, pingUser, plurial } from '../../utils/toolbox';
import replies from '../../data/replies';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.invites'),
    module: 'administration',
    options: [
        {
            ...translator.commandData('commands.admins.invites.options.reset'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.invites.options.reset.options.server'),
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    ...translator.commandData('commands.admins.invites.options.reset.options.user'),
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.invites.options.bonus'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.invites.options.bonus.options.add'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.invites.options.bonus.options.add.options.user'),
                            required: true,
                            type: ApplicationCommandOptionType.User
                        },
                        {
                            ...translator.commandData(
                                'commands.admins.invites.options.bonus.options.add.options.invites'
                            ),
                            required: true,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.invites.options.bonus.options.remove'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.invites.options.bonus.remove.options.user'),
                            required: true,
                            type: ApplicationCommandOptionType.User
                        },
                        {
                            ...translator.commandData('commands.admins.invites.options.bonus.remove.options.invites'),
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
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'invitations'))
        return interaction
            .reply({
                embeds: [
                    replies.moduleDisabled(interaction.user, {
                        guild: interaction.guild,
                        module: 'invitations',
                        lang: interaction
                    })
                ],
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
                .setTitle(translator.translate('commands.admins.invites.replies.reset.confirmation.title', interaction))
                .setDescription(
                    translator.translate(
                        `commands.admins.invites.replies.reset.confirmation.description${cmd === 'serveur' ? 'Server' : 'User'}`,
                        interaction,
                        { user: pingUser(user?.id) }
                    )
                )
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(log4js.trace);

        if (cmd === 'serveur') {
            invitesManager.resetGuild(interaction.guild.id, { resetInvitations: true });
        } else {
            invitesManager.resetUser(interaction.guild.id, interaction.user.id, { resetInvitations: true });
        }

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate('commands.admins.invites.replies.reset.setted.title', interaction)
                        )
                        .setDescription(
                            translator.translate(
                                `commands.admins.invites.replies.reset.setted.description${cmd === 'serveur' ? 'Server' : 'User'}`,
                                interaction,
                                { user: pingUser(user?.id) }
                            )
                        )
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
            invitesManager.addInvites(
                interaction.guild.id,
                user.id,
                { type: 'bonus', amount },
                { type: 'total', amount }
            );
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.invites.bonus.added.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.invites.bonus.added.description', interaction, {
                                    invites: amount,
                                    user: pingUser(user)
                                })
                            )
                    ]
                })
                .catch(log4js.trace);
        } else {
            const quantity = Math.min(invitesManager.getStats(interaction.guild.id, user.id).bonus, amount) * -1;
            if (quantity === 0)
                return interaction.reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.invites.replies.bonus.notEnough.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.invites.replies.bonus.notEnough.description',
                                    interaction,
                                    {
                                        amount,
                                        user: pingUser(user)
                                    }
                                )
                            )
                    ]
                });

            invitesManager.addInvites(
                interaction.guild.id,
                user.id,
                { type: 'bonus', amount: quantity },
                { type: 'total', amount: quantity }
            );
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                translator.translate('commands.admins.invites.replies.removed.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.invites.replies.removed.description',
                                    interaction,
                                    {
                                        amount: quantity,
                                        user: pingUser(user)
                                    }
                                )
                            )
                    ]
                })
                .catch(log4js.trace);
        }
    }
});
