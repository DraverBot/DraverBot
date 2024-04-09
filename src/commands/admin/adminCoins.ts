import { modulesManager, coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message } from 'discord.js';
import { inBank, inPocket, yesNoRow } from '../../data/buttons';
import replies from '../../data/replies';
import economyCheck from '../../preconditions/economyCheck';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { util } from '../../utils/functions';
import query from '../../utils/query';
import { addModLog, basicEmbed, confirm, numerize, pingUser, row, subcmd, waitForReplies } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.coins'),
    module: 'administration',
    preconditions: [preconditions.GuildOnly, moduleEnabled, economyCheck],
    options: [
        {
            ...translator.commandData('commands.admins.coins.options.reset'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coins.options.reset.options.user'),
                    required: false,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.coins.options.add'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coins.options.add.options.user'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    ...translator.commandData('commands.admins.coins.options.add.options.amount'),
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.coins.options.remove'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coins.options.remove.options.user'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    ...translator.commandData('commands.admins.coins.options.remove.options.amount'),
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.coins.options.voir'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coins.options.voir.options.member'),
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        }
    ],
    permissions: ['ManageGuild']
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'economy'))
        return interaction
            .reply({
                ephemeral: true,
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'economy' })]
            })
            .catch(log4js.trace);

    const subcommand = subcmd(options);

    if (subcommand === 'réinitialiser') {
        const user = options.getUser('utilisateur');

        const confirm = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setColor('Grey')
                    .setTitle(translator.translate('commands.admins.coins.options.reset.replies.confirm.title', interaction))
                    .setDescription(
                        translator.translate(`commands.admins.coins.options.reset.replies.confirm.${!!user ? 'user' : 'server'}`, interaction, { user: pingUser(user) })
                    )
            ],
            components: [yesNoRow()],
            fetchReply: true
        }).catch(log4js.trace)) as Message<true>;

        const rep = await waitForInteraction({
            componentType: ComponentType.Button,
            message: confirm,
            user: interaction.user,
            replies: waitForReplies(interaction.client)
        });

        if (!rep || rep.customId === 'no')
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        const res = await query(
            `DELETE FROM coins WHERE guild_id="${interaction.guild.id}"${user ? ` AND user_id="${user.id}"` : ''}`
        ).catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [replies.mysqlError(interaction.user, { guild: interaction.guild })],
                    components: []
                })
                .catch(log4js.trace);

        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: user?.id ?? 'none',
            type: 'CoinsReset',
            reason: 'Pas de raison'
        }).catch(log4js.trace);

        coinsManager.start();
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.coins.options.reset.replies.resetted.title', interaction))
                        .setDescription(
                            translator.translate(`commands.admins.coins.options.reset.replies.resetted.${!!user ? 'user' : 'server'}`, interaction)
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (subcommand === 'ajouter') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const place = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle(translator.translate('commands.admins.coins.options.add.replies.place.title', interaction))
                    .setDescription(translator.translate('commands.admins.coins.options.add.replies.place.description', interaction))
                    .setColor('Grey')
            ],
            fetchReply: true,
            components: [row(inPocket(), inBank())]
        })) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: place,
            replies: waitForReplies(interaction.client)
        });

        if (!reply)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        const endroit = translator.translate(`commands.admins.coins.places.${reply.customId === 'coins.pocket' ? 'pocket' : 'bank'}`, interaction);

        reply.deferUpdate().catch(log4js.trace);
        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.coins.options.add.replies.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.coins.options.add.replies.confirm.description', interaction, {
                        amount,
                        user: pingUser(user),
                        place: endroit
                    })
                )
        });

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({
                embeds: [replies.cancel()],
                components: []
            });

        if (reply.customId === 'coins.pocket') {
            coinsManager.addCoins({
                guild_id: interaction.guild.id,
                user_id: user.id,
                coins: amount
            });
        } else {
            coinsManager.addBank({
                guild_id: interaction.guild.id,
                user_id: user.id,
                bank: amount
            });
        }

        addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            member_id: user.id,
            mod_id: interaction.user.id,
            type: 'CoinsAdd'
        }).catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.coins.options.add.replies.added.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.coins.options.add.replies.added.description', interaction, {
                                amount,
                                user: pingUser(user),
                                author: pingUser(interaction.user)
                            })
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (subcommand === 'retirer') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const place = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle(translator.translate('commands.admins.coins.options.remove.replies.place.title', interaction))
                    .setDescription(translator.translate('commands.admins.coins.options.remove.replies.place.description', interaction))
                    .setColor('Grey')
            ],
            fetchReply: true,
            components: [row(inPocket(), inBank())]
        })) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: place,
            replies: waitForReplies(interaction.client)
        });

        if (!reply)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await reply.deferUpdate().catch(log4js.trace);
        const endroit = translator.translate(`commands.admins.coins.places.${reply.customId === 'coins.pocket' ? 'pocket' : 'bank'}`, interaction);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.coins.options.remove.replies.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.coins.options.remove.replies.confirm.description', interaction, {
                        amount,
                        user: pingUser(user),
                        place: endroit
                    })
                )
        });

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({
                embeds: [replies.cancel()],
                components: []
            });

        const selected = coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        })[reply.customId === 'coins.pocket' ? 'coins' : 'bank'];

        if (selected < amount)
            return interaction
                .editReply({
                    embeds: [
                        replies.notEnoughCoins(
                            interaction.member as GuildMember,
                            options.getMember('utilisateur') as GuildMember
                        )
                    ],
                    components: []
                })
                .catch(() => {});

        if (reply.customId === 'coins.pocket') {
            coinsManager.removeCoins({
                guild_id: interaction.guild.id,
                user_id: user.id,
                coins: amount
            });
        } else {
            coinsManager.removeBank({
                guild_id: interaction.guild.id,
                user_id: user.id,
                bank: amount
            });
        }

        addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            member_id: user.id,
            mod_id: interaction.user.id,
            type: 'CoinsRemove'
        }).catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.coins.options.remove.replies.removed.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.coins.options.remove.replies.removed.description', interaction, {
                                amount,
                                user: pingUser(user),
                                author: pingUser(interaction.user)
                            })
                        )
                ],
                components: []
            })
            .catch(() => {});
    }
    if (subcommand === 'voir') {
        const user = options.getUser('personne');
        const stats = coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: user.id
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setDescription(translator.translate('commands.admins.coins.options.voir.info.description', interaction, { user: pingUser(user) }))
                        .setTitle(translator.translate('commands.admins.coins.options.voir.info.title', interaction))
                        .setFields(
                            [["pocket", stats.coins], ["bank", stats.bank], ["total", stats.coins + stats.bank]].map(([k, count]) => ({
                                name: translator.translate(`commands.admins.coins.options.voir.info.fields.${k}.name`, interaction),
                                value: translator.translate(`commands.admins.coins.options.voir.info.fields.${k}.value`, interaction, { count }),
                                inline: true
                            }))
                        )
                ]
            })
            .catch(() => {});
    }
});
