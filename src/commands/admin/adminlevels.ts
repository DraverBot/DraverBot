import { modulesManager, levelsManager, levelsChannels } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions, wait } from 'amethystjs';
import { ApplicationCommandOptionType, ChannelType, ComponentType, GuildMember, Message } from 'discord.js';
import replies from '../../data/replies';
import economyCheck from '../../preconditions/economyCheck';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { AdminLevelAddType } from '../../typings/commands';
import { confirmReturn } from '../../typings/functions';
import {
    addModLog,
    basicEmbed,
    buildButton,
    confirm,
    numerize,
    pingChan,
    pingUser,
    plurial,
    random,
    row,
    subcmd
} from '../../utils/toolbox';
import { cancelButton } from '../../data/buttons';
import { ButtonIds } from '../../typings/buttons';
import GetChannel from '../../process/GetChannel';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.levels'),
    module: 'administration',
    permissions: ['ManageGuild', 'ManageMessages'],
    preconditions: [preconditions.GuildOnly, moduleEnabled, economyCheck],
    options: [
        {
            ...translator.commandData('commands.admins.levels.options.reset'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.levels.options.reset.options.member'),
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.levels.options.add'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.levels.options.add.options.member'),
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.levels.options.add.options.type'),
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            ...translator.commandData('commands.admins.levels.types.messages'),
                            value: AdminLevelAddType.Messages
                        },
                        {
                            ...translator.commandData('commands.admins.levels.types.level'),
                            value: AdminLevelAddType.Level
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.levels.options.add.options.amount'),
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.levels.options.channels'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.levels.options.channels.options.list'),
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    ...translator.commandData('commands.admins.levels.options.channels.options.config'),
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.levels.options.remove'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.levels.options.remove.options.member'),
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.levels.options.remove.options.type'),
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            ...translator.commandData('commands.admins.levels.types.messages'),
                            value: AdminLevelAddType.Messages
                        },
                        {
                            ...translator.commandData('commands.admins.levels.types.level'),
                            value: AdminLevelAddType.Level
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.levels.options.remove.options.amount'),
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'level'))
        return interaction
            .reply({
                embeds: [
                    replies.moduleDisabled(interaction.user, {
                        guild: interaction.guild,
                        module: 'level',
                        lang: interaction
                    })
                ],
                ephemeral: true
            })
            .catch(() => {});

    const cmd = subcmd(options);

    if (cmd === 'configurer') {
        // eslint-disable-next-line prefer-const
        let configured: 'bl' | 'wl' = levelsChannels.getConfigured(interaction) ?? 'wl';
        let data = levelsChannels.getLists(interaction)[configured];

        const embed = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.levels.replies.configuration.title', interaction))
                .setDescription(
                    translator.translate(
                        `commands.admins.levels.replies.configuration.description_${configured}`,
                        interaction,
                        {
                            channels: data.length > 0 ? data.map((x) => pingChan(x)).join(' ') : ''
                        }
                    )
                );
        };
        const components = (allDisabled = false) => {
            return [
                row(
                    buildButton({
                        label: translator.translate('commands.admins.levels.buttons.add', interaction),
                        buttonId: 'LevelAddChannel',
                        style: 'Primary',
                        disabled: allDisabled || data.length === 25
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.levels.buttons.remove', interaction),
                        buttonId: 'LevelRemoveChannel',
                        style: 'Secondary',
                        disabled: allDisabled || data.length === 0
                    }),
                    buildButton({
                        label: translator.translate(`commands.admins.levels.buttons.change_${configured}`, interaction),
                        buttonId: 'LevelListSwap',
                        style: 'Secondary',
                        disabled: allDisabled
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.levels.buttons.purge', interaction),
                        buttonId: 'LevelPurgeList',
                        style: 'Secondary',
                        disabled: allDisabled || data.length === 0
                    })
                ),
                row(
                    buildButton({
                        label: translator.translate('commands.admins.levels.buttons.apply', interaction),
                        style: 'Success',
                        id: 'apply'
                    }),
                    cancelButton(interaction).setDisabled(allDisabled)
                )
            ];
        };
        const panel = (await interaction
            .reply({
                embeds: [embed()],
                components: components(),
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;
        if (!panel) return;

        const collector = panel.createMessageComponentCollector({
            time: 300000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (ctx) => {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    embeds: [replies.replyNotAllowed(ctx.member as GuildMember, ctx)],
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }

            if (ctx.customId === 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
                collector.stop('cancel');
            }
            if (ctx.customId === 'apply') {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(translator.translate('commands.admins.levels.replies.applied.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.levels.replies.applied.description', ctx)
                                )
                        ],
                        components: []
                    })
                    .catch(log4js.trace);
                collector.stop('apply');
            }
            if (ctx.customId === ButtonIds.LevelPurgeList) {
                data = [];

                ctx.deferUpdate().catch(log4js.trace);
                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.LevelListSwap) {
                configured = configured === 'bl' ? 'wl' : 'bl';

                ctx.deferUpdate().catch(log4js.trace);
                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.LevelAddChannel || ctx.customId === ButtonIds.LevelRemoveChannel) {
                const action = ctx.customId === ButtonIds.LevelAddChannel ? 'add' : 'remove';

                interaction
                    .editReply({
                        components: components(true)
                    })
                    .catch(log4js.trace);
                const channel = await GetChannel.process({
                    interaction: ctx,
                    embed: basicEmbed(interaction.user, { questionMark: true })
                        .setTitle(translator.translate('commands.admins.levels.replies.channel.title', ctx))
                        .setDescription(
                            translator.translate(`commands.admins.levels.replies.channel.description_${action}`, ctx)
                        ),
                    user: interaction.user,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory],
                    checks: [
                        {
                            check: (chan) => (action === 'add' ? !data.includes(chan.id) : data.includes(chan.id)),
                            reply: {
                                embeds: [
                                    basicEmbed(interaction.user, { evoker: interaction.guild })
                                        .setTitle(
                                            translator.translate('commands.admins.levels.replies.invalid.title', ctx)
                                        )
                                        .setDescription(
                                            translator.translate(
                                                `commands.admins.levels.replies.invalid.description_${action}`,
                                                ctx
                                            )
                                        )
                                ]
                            }
                        }
                    ]
                });

                if (channel === 'cancel' || channel === "time's up") {
                    ctx.deleteReply().catch(log4js.trace);
                    interaction
                        .editReply({
                            components: components()
                        })
                        .catch(log4js.trace);
                    return;
                }

                ctx.deleteReply().catch(log4js.trace);

                if (action === 'add') {
                    data.push(channel.id);
                } else {
                    data = data.filter((x) => x !== channel.id);
                }

                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
        });

        collector.on('end', async (_c, reason) => {
            if (reason === 'apply') {
                if (configured !== levelsChannels.getConfigured(interaction)) {
                    levelsChannels.swap(interaction);
                    await wait(500);
                }
                levelsChannels.setList(interaction.guild, data);
            } else if (reason !== 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
            }
        });
    }
    if (cmd === 'liste') {
        const configured = levelsChannels.getConfigured(interaction);
        const list = levelsChannels.getLists(interaction)[configured];

        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(
                                translator.translate('commands.admins.levels.replies.emptyList.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.levels.replies.emptyList.description',
                                    interaction
                                )
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate(`commands.admins.levels.replies.list.title_${configured}`, interaction)
                        )
                        .setDescription(
                            translator.translate(
                                `commands.admins.levels.replies.list.description_${configured}`,
                                interaction,
                                {
                                    channels: list.map((x) => pingChan(x)).join(' ')
                                }
                            )
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'réinitialiser') {
        const user = options.getUser('membre');

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.levels.replies.resetting.title', interaction))
                .setDescription(
                    translator.translate(
                        `commands.admins.levels.replies.resetting.description${!!user ? 'User' : 'Server'}`,
                        interaction,
                        {
                            user: pingUser(user?.id)
                        }
                    )
                )
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        await interaction.editReply({
            embeds: [replies.wait(interaction.user, interaction)],
            components: []
        });
        await levelsManager.reset(interaction.guild.id, user?.id);

        await addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            mod_id: interaction.user.id,
            member_id: user?.id,
            type: 'LevelReset'
        }).catch(() => {});

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(
                                    translator.translate('commands.admins.levels.replies.resetted.title', interaction)
                                )
                                .setDescription(
                                    translator.translate(
                                        `commands.admins.levels.replies.resetted.description${!!user ? 'User' : 'Server'}`,
                                        interaction,
                                        {
                                            user: pingUser(user?.id)
                                        }
                                    )
                                )
                        ]
                    })
                    .catch(() => {});
            },
            random({ max: 6, min: 3 }) * 1000
        );
    }
    if (cmd === 'ajouter') {
        const user = options.getUser('membre');
        const amount = options.getInteger('montant');
        const type = options.getString('type') as AdminLevelAddType;
        const strType = type === AdminLevelAddType.Level ? 'niveau' : 'message';
        const plurialSuffix = type === AdminLevelAddType.Level ? 'x' : 's';

        const validation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.levels.replies.adding.title', interaction))
                .setDescription(
                    translator.translate(`commands.admins.levels.replies.adding.description_${type}`, interaction, {
                        levels: amount,
                        user: pingUser(user)
                    })
                )
        }).catch(() => {})) as confirmReturn;

        if (validation === 'cancel' || !validation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user, validation.interaction)],
                components: []
            })
            .catch(() => {});

        await levelsManager.addXp({
            amount,
            user_id: user.id,
            type,
            guild_id: interaction.guild.id
        });

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(
                                    translator.translate('commands.admins.levels.replies.added.title', interaction)
                                )
                                .setDescription(
                                    translator.translate(
                                        `commands.admins.levels.replies.added.description_${type}`,
                                        interaction,
                                        {
                                            levels: amount,
                                            user: pingUser(user)
                                        }
                                    )
                                )
                        ],
                        components: []
                    })
                    .catch(() => {});
            },
            random({ max: 5, min: 2 }) * 1000
        );
    }
    if (cmd === 'retirer') {
        const user = options.getUser('membre');
        const amount = options.getInteger('montant');
        const type = options.getString('type') as AdminLevelAddType;
        const strType = type === AdminLevelAddType.Level ? 'niveau' : 'message';
        const plurialSuffix = type === AdminLevelAddType.Level ? 'x' : 's';

        const validation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.levels.replies.removing.title', interaction))
                .setDescription(
                    translator.translate(`commands.admins.levels.replies.removing.description_${type}`, interaction, {
                        levels: amount,
                        user: pingUser(user)
                    })
                )
        }).catch(() => {})) as confirmReturn;

        if (validation === 'cancel' || !validation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user, validation.interaction)],
                components: []
            })
            .catch(() => {});

        await levelsManager.removeXp({
            amount,
            user_id: user.id,
            type,
            guild_id: interaction.guild.id
        });

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(
                                    translator.translate('commands.admins.levels.replies.removed.title', interaction)
                                )
                                .setDescription(
                                    translator.translate(
                                        `commands.admins.levels.replies.removed.description_${type}`,
                                        interaction,
                                        {
                                            levels: amount,
                                            user: pingUser(user)
                                        }
                                    )
                                )
                        ],
                        components: []
                    })
                    .catch(() => {});
            },
            random({ max: 5, min: 2 }) * 1000
        );
    }
});
