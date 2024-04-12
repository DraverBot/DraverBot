import { modulesManager, giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForMessage } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    InteractionReplyOptions,
    Message,
    Role,
    TextChannel
} from 'discord.js';
import timePrecondition from '../../preconditions/time';
import {
    addTimeDoc,
    basicEmbed,
    buildButton,
    capitalize,
    checkCtx,
    confirm,
    displayDate,
    evokerColor,
    getMsgUrl,
    notNull,
    numerize,
    pagination,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    row,
    subcmd
} from '../../utils/toolbox';
import ms from 'ms';
import { cancelButton } from '../../data/buttons';
import replies from '../../data/replies';
import { getRolePerm, util } from '../../utils/functions';
import { GWListType } from '../../typings/commands';
import { confirmReturn } from '../../typings/functions';
import { giveaway, giveawayInput } from '../../typings/giveaway';
import SendAndDelete from '../../process/SendAndDelete';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.gw'),
    module: 'giveaways',
    permissions: ['ManageChannels', 'ManageGuild'],
    preconditions: [preconditions.GuildOnly, moduleEnabled, timePrecondition],
    options: [
        {
            ...translator.commandData('commands.admins.gw.options.start'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData(
                        'commands.admins.gw.options.start.options.reward'
                    ),
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.winners'),
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.time'),
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.channel'),
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.bonus'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.required'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.denied'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.level'),
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    ...translator.commandData('commands.admins.gw.options.start.options.invites'),
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.gw.options.create'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.gw.options.list'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData(
                        'commands.admins.gw.options.list.option'
                    ),
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    choices: [GWListType.All, GWListType.Current, GWListType.Ended].map(x => ({
                        ...translator.commandData(`commands.admins.gw.options.list.types.${x}`),
                        value: x
                    }))
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.gw.options.analyze'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.gw.options.analyze.option'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.gw.options.reroll'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData(
                        'commands.admins.gw.options.reroll.option'
                    ),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.gw.options.end'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.gw.options.end.option'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.gw.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.gw.options.delete.option'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'démarrer') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;
        const reward = options.getString('récompense');
        const time = ms(options.getString('temps'));

        const roleFilter = (s: string) => s.length > 0;
        const bonuses = (options.getString('bonus') ?? '').split(/ +/g).filter(roleFilter);
        const required = (options.getString('requis') ?? '').split(/ +/g).filter(roleFilter);
        const denied = (options.getString('interdits') ?? '').split(/ +/g).filter(roleFilter);
        const winnerCount = options.getInteger('gagnants');
        const level = options.getInteger('niveau') ?? 0;
        const invites = options.getInteger('invitations') ?? 0;

        await interaction.deferReply();

        const gw = (await giveaways
            .createGiveaway({
                guild_id: interaction.guild.id,
                channel,
                winnerCount,
                bonus_roles: bonuses.length > 0 ? bonuses : [],
                reward,
                required_roles: required.length > 0 ? required : [],
                denied_roles: denied.length > 0 ? denied : [],
                hoster_id: interaction.user.id,
                time: time,
                required_level: level,
                required_invitations: invites
            })
            .catch(console.log)) as giveaway;

        if (!gw)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle(translator.translate('commands.admins.gw.replies.start.error.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.gw.replies.start.error.description', interaction, {
                                    channel: pingChan(channel)
                                })
                            )
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.gw.replies.start.created.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.gw.replies.start.created.description', interaction, {
                                reward,
                                channel: pingChan(channel),
                                winners: winnerCount,
                                date: displayDate(time  + Date.now())
                            })
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'créer') {
        const data: giveawayInput = {
            reward: translator.translate('commands.admins.gw.replies.create.example', interaction),
            required_roles: [],
            denied_roles: [],
            bonus_roles: [],
            winnerCount: 1,
            time: 3600000,
            hoster_id: interaction.user.id,
            guild_id: interaction.guild.id,
            channel: interaction.channel as TextChannel,
            required_level: 0,
            required_invitations: 0
        };

        let hasCurrentAction = false;
        const basic = (fetch?: boolean): InteractionReplyOptions => {
            const currentAction = hasCurrentAction;
            const components = [
                row(
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.reward', interaction),
                        id: 'reward',
                        style: 'Primary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.winners', interaction),
                        id: 'winnerCount',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.time', interaction),
                        id: 'time',
                        style: 'Secondary',
                        disabled: currentAction
                    })
                ),
                row(
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.channel', interaction),
                        id: 'channel',
                        style: 'Primary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.bonus', interaction),
                        id: 'bonus_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.required', interaction),
                        id: 'required_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.denied', interaction),
                        id: 'denied_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    })
                ),
                row(
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.level', interaction),
                        id: 'level',
                        style: 'Secondary',
                        disabled: !modulesManager.enabled(interaction.guild.id, 'level') || currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.invites', interaction),
                        id: 'invitations',
                        style: 'Secondary',
                        disabled: !modulesManager.enabled(interaction.guild.id, 'invitations') || currentAction
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.gw.buttons.validate', interaction),
                        id: 'validate',
                        style: 'Success',
                        disabled: currentAction
                    }),
                    cancelButton(interaction).setDisabled(currentAction)
                )
            ];
            return {
                embeds: [
                    basicEmbed(interaction.user)
                        .setColor('Grey')
                        .setTitle(translator.translate('commands.admins.gw.replies.create.embed.title', interaction))
                        .setDescription(translator.translate('commands.admins.gw.replies.create.embed.description', interaction))
                        .setFields(
                            ...[
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.reward.name', interaction),
                                    value: data.reward,
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.winners.name', interaction),
                                    value: translator.translate('commands.admins.gw.replies.create.embed.fields.winners.value', interaction, {
                                        winners: data.winnerCount
                                    }),
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.ends.name', interaction),
                                    value: displayDate(Date.now() + data.time),
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.channel.name', interaction),
                                    value: pingChan(data.channel),
                                    inline: false
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.bonus.name', interaction),
                                    value:
                                        data.bonus_roles?.length > 0
                                            ? data.bonus_roles.map(pingRole).join(' ')
                                            : translator.translate('commands.admins.gw.replies.create.embed.fields.bonus.default', interaction),
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.required.name', interaction),
                                    value:
                                        data.required_roles?.length > 0
                                            ? data.required_roles.map(pingRole).join(' ')
                                            : translator.translate('commands.admins.gw.replies.create.embed.fields.required.default', interaction),
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.gw.replies.create.embed.fields.denied.name', interaction),
                                    value:
                                        data.denied_roles?.length > 0
                                            ? data.denied_roles?.map(pingRole).join(' ')
                                            : translator.translate('commands.admins.gw.replies.create.embed.fields.denied.default', interaction),
                                    inline: true
                                },
                                {
                                    name: '\u200b',
                                    value: '\u200b',
                                    inline: false
                                },
                                modulesManager.enabled(interaction.guild.id, 'invitations')
                                    ? {
                                          name: translator.translate('commands.admins.gw.replies.create.embed.fields.invites.name', interaction),
                                          value:
                                              data.required_invitations === 0
                                                  ? translator.translate('commands.admins.gw.replies.create.embed.fields.invites.none', interaction)
                                                  : translator.translate('commands.admins.gw.replies.create.embed.fields.invites.value', interaction, {
                                                    invites: data.required_invitations
                                                  }),
                                          inline: true
                                      }
                                    : null,
                                modulesManager.enabled(interaction.guild.id, 'level')
                                    ? {
                                          name: translator.translate('commands.admins.gw.replies.create.embed.fields.levels.name', interaction),
                                          value:
                                              data.required_level === 0
                                                  ? translator.translate('commands.admins.gw.replies.create.embed.fields.levels.none', interaction)
                                                  : translator.translate('commands.admins.gw.replies.create.embed.fields.levels.value', interaction, {
                                                    level: data.required_level
                                                }),
                                          inline: true
                                      }
                                    : null
                            ].filter(notNull)
                        )
                ],
                components: components,
                fetchReply: notNull(fetch) ? fetch : false
            };
        };

        const msg = (await interaction.reply(basic()).catch(() => {})) as unknown as Message<true>;
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({
            time: 600000,
            componentType: ComponentType.Button
        });

        const reedit = () => {
            interaction.editReply(basic()).catch(() => {});
        };

        hasCurrentAction = false;
        collector.on('collect', async (ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;

            if (ctx.customId === 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});
                return collector.stop('canceled');
            }
            if (ctx.customId === 'validate') {
                interaction
                    .editReply({
                        embeds: [replies.wait(interaction.user, ctx)],
                        components: []
                    })
                    .catch(() => {});

                const gw = (await giveaways.createGiveaway(data).catch(() => {})) as giveaway;
                if (!gw) {
                    interaction
                        .editReply({
                            embeds: [
                                basicEmbed(interaction.user)
                                    .setTitle(translator.translate('commands.admins.gw.replies.create.error.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.gw.replies.create.error.description', interaction, {
                                            channel: pingChan(data.channel)
                                        })
                                    )
                                    .setColor(evokerColor(interaction.guild))
                            ]
                        })
                        .catch(() => {});
                }
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(translator.translate('commands.admins.gw.replies.create.created.title', interaction))
                                .setDescription(translator.translate('commands.admins.gw.replies.create.created.description', interaction, { channel: pingChan(data.channel) }))
                        ]
                    })
                    .catch(() => {});
                return collector.stop('sent');
            }

            const setDeleteTmst = () => {
                setTimeout(() => {
                    ctx.deleteReply().catch(() => {});
                }, 10000);
            };

            interaction.editReply(basic()).catch(() => {});

            hasCurrentAction = true;
            if (ctx.customId === 'channel') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.channel.title', interaction))
                                .setColor('Grey')
                                .setDescription(
                                    translator.translate('commands.admins.gw.rpelies.create.channel.description', interaction)
                                )
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;
                if (!rep) return;

                const reply = (await waitForMessage({
                    channel: rep.channel as TextChannel,
                    user: interaction.user,
                    time: 120000
                }).catch(() => {})) as Message<true>;

                hasCurrentAction = false;
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({ embeds: [replies.cancel(interaction)] }).catch(() => {});
                    setDeleteTmst();
                    reedit();
                    return;
                }
                if (reply?.deletable) reply.delete().catch(() => {});
                const channel =
                    interaction.guild.channels.cache.find((x) => x.name === reply.content || x.id === reply.content) ||
                    interaction.guild.channels.cache.get(reply.content) ||
                    reply.mentions.channels.first();

                if (!channel || channel.type !== ChannelType.GuildText) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.invalidChannel.title', ctx))
                                .setDescription(translator.translate('commands.admins.gw.replies.create.invalidChannel.description', ctx))
                                .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                    setDeleteTmst();
                    return reedit();
                }

                ctx.deleteReply(rep).catch(() => {});
                data.channel = channel;
                reedit();
            }
            if (ctx.customId.includes('roles')) {
                const type = translator.translate(`commands.admins.gw.create.embed.fields.${ctx.customId === 'roles_required' ? 'required' : ctx.customId === 'denied_roles' ? 'denied' : 'bonus'}.name`, ctx).toLowerCase()

                const rep = (await ctx
                    .reply({
                        fetchReply: true,
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(capitalize(type))
                                .setDescription(
                                    translator.translate('commands.admins.gw.create.roles.description', ctx)
                                )
                                .setColor('Grey')
                        ]
                    })
                    .catch(() => {})) as Message<true>;
                if (!rep) return;

                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;

                if (reply.deletable) reply.delete().catch(() => {});

                hasCurrentAction = false;
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    setDeleteTmst();

                    reedit();
                    return;
                }
                if (reply.content.toLowerCase() === 'vide') {
                    data[ctx.customId] = [];
                    reedit();
                    ctx.deleteReply(rep).catch(() => {});
                    return;
                }
                const names = reply.content.split(/ +/g);
                const roles: Role[] = reply.mentions.roles.toJSON();

                for (const name of names) {
                    const role =
                        interaction.guild.roles.cache.get(name) ||
                        interaction.guild.roles.cache.find((x) => x.name === name);
                    if (role && !roles.includes(role)) roles.push(role);
                }

                if (roles.length === 0) {
                    setDeleteTmst();
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.noRole.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.noRole.description', ctx)
                                )
                                .setColor('Grey')
                        ]
                    }).catch(() => {});
                    reedit();
                    return;
                }

                const checkRoles = (roles: string[]) => {
                    const isInBothArrays = (arr1: string[], arr2: string[]) => arr1.some((item) => arr2.includes(item));

                    switch (ctx.customId) {
                        case 'denied_roles':
                            if (isInBothArrays(roles, data.bonus_roles) || isInBothArrays(roles, data.required_roles))
                                return false;
                            break;
                        case 'required_roles':
                            if (isInBothArrays(roles, data.bonus_roles) || isInBothArrays(roles, data.denied_roles))
                                return false;
                            break;
                        case 'bonus_roles':
                            if (isInBothArrays(roles, data.denied_roles) || isInBothArrays(roles, data.required_roles))
                                return false;
                            break;
                    }

                    return true;
                };

                const valid = checkRoles(roles.map((x) => x.id));

                if (!valid) {
                    setDeleteTmst();
                    reedit();
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.invalidRole.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.invalidRole.description', ctx)
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    });
                    return;
                }
                ctx.deleteReply(rep).catch(() => {});
                data[ctx.customId] = roles.map((x) => x.id);
                reedit();
            }
            if (ctx.customId === 'winnerCount') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.winners.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.winners.description', ctx)
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content === 'cancel') {
                    interaction
                        .editReply({
                            embeds: [replies.cancel(interaction)]
                        })
                        .catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }
                const int = parseInt(reply.content);
                if (!int || isNaN(int) || int < 1 || int > 100) {
                    reedit();
                    setDeleteTmst();
                    interaction
                        .editReply({
                            embeds: [replies.invalidNumber(interaction.member as GuildMember, reply)]
                        })
                        .catch(() => {});
                    return;
                }
                data.winnerCount = int;
                reedit();
                ctx.deleteReply(rep).catch(() => {});
            }
            if (ctx.customId === 'time') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.time.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.time.description', ctx, {
                                        doc: addTimeDoc(
                                            interaction.user.id,
                                            interaction
                                        )
                                    })
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;

                hasCurrentAction = false;
                if (reply.deletable) reply.delete().catch(() => {});

                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const time = ms(reply.content);
                if (!time || isNaN(time)) {
                    ctx.editReply({
                        embeds: [
                            replies.invalidTime((interaction?.member as GuildMember) ?? interaction.user, interaction)
                        ]
                    }).catch(() => {});
                    setDeleteTmst();
                    reedit();
                    return;
                }

                data.time = time;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'reward') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.reward.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.reward.description', ctx)
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                data.reward = reply.content;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'level') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.level.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.level.description', ctx)
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const int = parseInt(reply?.content);
                if (!int || isNaN(int) || int < 0) {
                    reedit();
                    SendAndDelete.process(
                        { embeds: [replies.invalidNumber(interaction.member as GuildMember, reply)] },
                        interaction.channel as TextChannel
                    );
                    return;
                }
                data.required_level = int;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'invitations') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('commands.admins.gw.replies.create.invites.title', ctx))
                                .setDescription(
                                    translator.translate('commands.admins.gw.replies.create.invites.description', ctx)
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const int = parseInt(reply?.content);
                if (!int || isNaN(int) || int < 0) {
                    reedit();
                    SendAndDelete.process(
                        { embeds: [replies.invalidNumber(interaction.member as GuildMember, reply)] },
                        interaction.channel as TextChannel
                    );
                    return;
                }
                data.required_invitations = int;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
        });
        collector.on('end', (_ctx, reason) => {
            if (!['sent', 'canceled'].includes(reason)) {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});
            }
        });
    }
    if (cmd === 'liste') {
        const type = (options.getString('giveaways') as GWListType) ?? GWListType.Current;
        const list = giveaways.list.ended.concat(giveaways.list.giveaways);

        console.log(type);
        const gws = list
            .filter((x) => x.guild_id === interaction.guild.id)
            .filter((x) => {
                if (type === GWListType.All) return x.guild_id === interaction.guild.id;
                if (type === GWListType.Current) return x.guild_id === interaction.guild.id && x.ended === false;
                if (type === GWListType.Ended) return x.guild_id === interaction.guild.id && x.ended === true;
                return true;
            });

        const typeStr = type === GWListType.All ? '' : ' ' + translator.translate(`commands.admins.gw.options.list.types.${type}`, interaction);
        if (gws.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.list.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.list.no.description', interaction, {
                                type: typeStr
                            }))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.gw.replies.list.title', interaction))
                .setDescription(translator.translate('commands.admins.gw.replies.list.description', interaction, { gws: gws.length }));
        };
        const cache = {
            running: null,
            ended: null
        }
        const mapField = (embed: EmbedBuilder, gw: giveaway) => {
            const state = (() => {
                const str = gw.ended ? 'ended' : 'running'
                if (cache[str]) return cache[str]

                cache[str] = translator.translate(`commands.admins.gw.replies.list.list.states.${str}`, interaction)
                return cache[str]
            })()

            return embed.addFields({
                name: gw.reward,
                value: translator.translate('commands.admins.gw.replies.list.list.mapper', interaction, {
                    user: pingUser(gw.hoster_id),
                    id: gw.hoster_id,
                    winners: gw.winnerCount,
                    date: displayDate(gw.endsAt),
                    state
                }),
                inline: false
            });
        };

        if (gws.length <= 5) {
            const embed = basic();
            for (const gw of gws) {
                mapField(embed, gw);
            }

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds: EmbedBuilder[] = [basic()];
            gws.forEach((log, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                mapField(embeds[embeds.length - 1], log);
            });

            pagination({
                interaction,
                user: interaction.user,
                embeds
            });
        }
    }
    if (cmd === 'analyser') {
        const id = options.getString('identifiant');
        const gw = giveaways.fetchGiveaway(id, true);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.analyze.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.analyze.no.description', interaction, { id }))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const embed = basicEmbed(interaction.user, { draverColor: true })
            .setTitle(translator.translate('commands.admins.gw.replies.analyze.info.title', interaction))
            .setDescription(
                translator.translate('commands.admins.gw.replies.analyze.info.description', interaction, {
                    id: gw.message_id,
                    state: translator.translate(`commands.admins.gw.list.list.states.${gw.ended ? 'ended' : 'running'}`, interaction)
                })
            );

        if (!gw.ended) {
            embed.addFields({
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.date.name', interaction),
                value: displayDate(gw.endsAt),
                inline: true
            });
        }
        embed.addFields(
            {
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.hoster.name', interaction),
                value: translator.translate('commands.admins.gw.replies.analyze.info.fields.hoster.value', interaction, {
                    user: pingUser(gw.hoster_id),
                    id: gw.hoster_id
                }),
                inline: true
            },
            {
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.channel.name', interaction),
                value: translator.translate('commands.admins.gw.replies.analyze.info.fields.channel.value', interaction, {
                    channel: pingChan(gw.channel_id),
                    id: gw.channel_id
                }),
                inline: true
            },
            {
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.reward', interaction),
                value: gw.reward,
                inline: false
            },
            {
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.winnersField.name', interaction),
                value: translator.translate('commands.admins.gw.replies.analyze.info.fields.winnersField.value', interaction, { winners: gw.winnerCount }),
                inline: true
            },
            {
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.participants.name', interaction),
                value: translator.translate('commands.admins.gw.replies.analyze.info.fields.participants.value', interaction, {
                    participants: gw.participants.length
                }),
                inline: true
            }
        );
        if (gw.ended) {
            embed.addFields({
                name: translator.translate('commands.admins.gw.replies.analyze.info.fields.winners.name', interaction),
                value:
                    gw.winners.length > 0
                        ? translator.translate('commands.admins.gw.replies.analyze.info.fields.winners.value', interaction, {
                            count: gw.winners.length,
                            participants: gw.participants.length,
                            ratio: Math.floor((gw.winners.length * 100) / gw.participants.length),
                            map: gw.winners.map(pingUser).join(' ')
                        })
                        : translator.translate('commands.admins.gw.replies.analyze.info.fields.winners.none', interaction),
                inline: false
            });
        }
        const names = {
            bonus_roles: 'Rôles bonus',
            denied_roles: 'Rôles interdits',
            required_roles: 'Rôles requis'
        };
        for (const roleList of ['bonus_roles', 'required_roles', 'denied_roles']) {
            if (gw[roleList].length > 0) {
                embed.addFields({
                    name: translator.translate(`commands.admins.gw.replies.analyze.info.names.${roleList}`, interaction),
                    value: gw[roleList].map(pingRole).join(' '),
                    inline: true
                });
            }
        }

        interaction
            .reply({
                embeds: [embed]
            })
            .catch(() => {});
    }
    if (cmd === 'reroll') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id, true) as giveaway;

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.analyze.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.analyze.no.description', interaction, { id }))
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        if (!gw.ended)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.reroll.running.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.reroll.running.description', interaction))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        await interaction.deferReply({
            ephemeral: true
        });

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.gw.replies.reroll.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.gw.replies.reroll.confirm.description', interaction, {
                        url: getMsgUrl(gw),
                        id: gw.message_id,
                        channel: pingChan(gw.channel_id)
                    })
                )
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        const result = await giveaways.reroll(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.reroll.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.reroll.error.description', interaction, {
                                url: getMsgUrl(gw)
                            }))
                            .setColor(evokerColor(interaction.guild))
                    ],
                    components: []
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.gw.replies.reroll.rerolled.title', interaction))
                        .setDescription(translator.translate('commands.admins.gw.replies.reroll.rerolled.description', interaction, { url: getMsgUrl(gw) }))
                ],
                components: []
            })
            .catch(() => {});
    }
    if (cmd === 'terminer') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.analyze.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.analyze.no.description', interaction, { id }))
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        if (gw.ended)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.end.ended.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.gw.replies.end.ended.description', interaction)
                            )
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setDescription(
                    translator.translate('commands.admins.gw.replies.end.confirm.description', interaction, {
                        url: getMsgUrl(gw),
                        channel: pingChan(gw.channel_id)
                    })
                )
                .setTitle(translator.translate('commands.admins.gw.replies.end.confirm.title', interaction))
        }).catch(() => {})) as confirmReturn;

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user, confirmation.interaction)],
                components: []
            })
            .catch(() => {});

        const result = await giveaways.endGiveaway(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.end.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replieS.end.error.description', interaction, { url: getMsgUrl(gw) }))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.gw.replies.end.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.gw.replies.end.done.description', interaction, {
                            url: getMsgUrl(gw)
                        }))
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'supprimer') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id, true);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.analyze.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.analyze.no.description', interaction, { id }))
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setDescription(
                    translator.translate('commands.admins.gw.replies.delete.description', interaction, {
                        url: getMsgUrl(gw),
                        channel: pingChan(gw.channel_id)
                    })
                )
                .setTitle(translator.translate('commands.admins.replies.delete.confirm.title', interaction))
        }).catch(() => {})) as confirmReturn;

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user, confirmation.interaction)],
                components: []
            })
            .catch(() => {});

        const result = await giveaways.deleteGiveaway(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.admins.gw.replies.delete.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.gw.replies.delete.error.description', interaction, { url: getMsgUrl(gw) }))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.gw.replies.delete.deleted.title', interaction))
                        .setDescription(translator.translate('commands.admins.gw.replies.delete.deleted.description', interaction, { url: getMsgUrl(gw) }))
                ]
            })
            .catch(() => {});
    }
});
