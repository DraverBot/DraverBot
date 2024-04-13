import { ticketsManager, giveaways, tasksManager, rolesReact } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, GuildMember, Message, TextChannel } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    basicEmbed,
    confirm,
    numerize,
    pagination,
    pingChan,
    pingRole,
    plurial,
    resizeString
} from '../../utils/toolbox';
import replies from '../../data/replies';
import { RoleReact } from '../../structures/RoleReact';
import RoleReactConfigPanel from '../../process/RoleReactConfigPanel';
import GetMessage from '../../process/GetMessage';
import masterminds from '../../maps/masterminds';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.autorole'),
    module: 'administration',
    options: [
        {
            ...translator.commandData('commands.admins.autorole.options.create'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.autorole.options.create.options.construct'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.construct.options.title'),
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 256
                        },
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.construct.options.description'),
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 4096
                        },
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.construct.options.channel'),
                            required: true,
                            type: ApplicationCommandOptionType.Channel,
                            channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
                        },
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.construct.options.image'),
                            required: false,
                            type: ApplicationCommandOptionType.Attachment
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.autorole.options.create.options.message'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.message.options.title'),
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 256
                        },
                        {
                            ...translator.commandData('commands.admins.autorole.options.create.options.message.options.description'),
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 4096
                        }
                    ]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.autorole.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.autorole.options.delete.options.panel'),
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    autocomplete: true
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.autorole.options.list'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.autorole.options.list.options.panel'),
                    type: ApplicationCommandOptionType.Integer,
                    required: false,
                    autocomplete: true,
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild'],
    clientPermissions: ['ManageChannels']
}).setChatInputRun(async ({ interaction, options, client }) => {
    const cmd = options.getSubcommand();
    if (cmd === 'construction') {
        const title = options.getString('titre');
        const description = options.getString('description');
        const channel = options.getChannel('salon') as TextChannel;
        const img = options.getAttachment('image');

        if (img && !img.contentType.includes('image'))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.autorole.replies.construct.image.title', interaction))
                            .setDescription(translator.translate('commands.admins.autorole.replies.construct.image.description', interaction))
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const res = await RoleReactConfigPanel.process({ interaction, channel: interaction.channel as TextChannel });

        if (res === 'cancel') return;
        res.button.deferUpdate().catch(() => {});

        const creation = await rolesReact.create({
            title,
            description,
            image: img?.url ?? '',
            channel,
            user: interaction.user,
            roles: res.roles,
            lang: interaction
        });

        if (creation === 'message not found') {
            interaction
                .editReply({ embeds: [replies.internalError(interaction.member as GuildMember, res.button)] })
                .catch(log4js.trace);
            return;
        }

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.autorole.replies.construct.create.title', interaction))
                        .setDescription(translator.translate('commands.admins.autorole.replies.construct.create.description', interaction, {
                            channel: pingChan(channel)
                        }))
                ],
                components: []
            })
            .catch(log4js.trace);
        // Core
        // await interaction
        //     .reply({
        //         embeds: [replies.wait(interaction.user)]
        //     })
        //     .catch(log4js.trace);
    }
    if (cmd === 'supprimer') {
        const panelId = options.getInteger('panneau');
        const panel = rolesReact.getPanel(panelId);

        const confirmation = await confirm({
            interaction,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.autorole.replies.delete.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.autorole.replies.delete.confirm.description', interaction, {
                        title: resizeString({
                            str: panel.title,
                            length: 50
                        })
                    })
                ),
            user: interaction.user
        }).catch(log4js.trace);
        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(log4js.trace);

        rolesReact.delete(panel.id);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.autorole.replies.delete.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.autorole.replies.delete.done.description', interaction, {
                            title: resizeString({ str: panel.title, length: 50 })
                        }))
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd === 'liste') {
        const panelId = options.getInteger('panneau');
        if (rolesReact.exists(panelId)) {
            const panel = rolesReact.getPanel(panelId);

            const roles = {
                button: panel.ids.filter((x) => x.type === 'buttons'),
                menus: panel.ids.filter((x) => x.type === 'selectmenu')
            };

            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.autorole.replies.list.info.title', interaction, {
                                title: resizeString({ str: panel.title, length: 100 })
                            }))
                            .setFields(
                                { name: translator.translate('commands.admins.autorole.replies.list.info.channel', interaction), value: pingChan(panel.channel_id), inline: true },
                                {
                                    name: translator.translate('commands.admins.autorole.replies.list.info.buttons.name', interaction),
                                    value:
                                        roles.button.length === 0
                                            ? translator.translate('commands.admins.autorole.replies.list.info.buttons.none', interaction)
                                            : roles.button.map((x) => `${x.emoji} ${pingRole(x.role_id)}`).join('\n'),
                                    inline: true
                                },
                                {
                                    name: translator.translate('commands.admins.autorole.replies.list.info.menus.name', interaction),
                                    value:
                                        roles.menus.length === 0
                                            ? translator.translate('commands.admins.autorole.replies.list.info.menus.none', interaction)
                                            : roles.menus.map((x) => `${x.emoji} ${pingRole(x.role_id)}`).join('\n'),
                                    inline: true
                                }
                            )
                    ]
                })
                .catch(log4js.trace);
        }

        const list = rolesReact.getList(interaction.guild.id);
        const embed = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.autorole.replies.list.list.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.autorole.replies.list.list.description', interaction, {
                        count: list.size,
                        name: interaction.guild.name
                    })
                );
        const mapper = (embed: EmbedBuilder, item: RoleReact) =>
            embed.addFields({
                name: resizeString({ str: item.title, length: 100 }),
                value: translator.translate('commands.admins.autorole.replies.list..list.mapper', interaction, {
                    count: item.ids.length,
                    buttons: item.ids.filter(x => x.type === 'buttons').length,
                    menus: item.ids.filter(x => x.type === 'selectmenu').length,
                    channel: pingChan(item.channel_id)
                })
            });
        if (list.size <= 5) {
            const em = embed();
            list.forEach((x) => mapper(em, x));

            interaction.reply({ embeds: [em] }).catch(log4js.trace);
        } else {
            const embeds = [embed()];

            list.forEach((x, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(embed());

                mapper(embeds[embeds.length - 1], x);
            });

            pagination({ interaction, user: interaction.user, embeds });
        }
    }
    if (cmd === 'message') {
        const message = await GetMessage.process({
            interaction,
            allowCancel: true,
            user: interaction.user,
            checks: {
                channel: [
                    {
                        check: (c) =>
                            [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(
                                c.type
                            ),
                        reply: {
                            embeds: [replies.invalidChannelType(interaction.member as GuildMember, [ChannelType.GuildText], interaction)
                            ]
                        }
                    }
                ],
                message: [
                    {
                        check: (m) => m.author.id === client.user.id,
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.author.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.autorole.replies.author.description', interaction)
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !ticketsManager.isTicket(m.id) && !ticketsManager.panels.get(m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.message.ticket.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.autorole.replies.message.ticket.description', interaction)
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !giveaways.map.giveaways.has(m.id) && !giveaways.map.ended.has(m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.message.giveaway.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.autorole.replies.message.giveaway.description', interaction)
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !tasksManager.cache.find((x) => x.data.message_id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.message.task.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.autorole.replies.message.task.description', interaction)
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !rolesReact.cache.find((x) => x.message_id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.message.react.title', interaction))
                                    .setDescription(
                                        translator.translate('commands.admins.autorole.replies.message.react.description', interaction)
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !masterminds.find((x) => x.message.id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.autorole.replies.message.mastermind.title', interaction))
                                    .setDescription(translator.translate('commands.admins.autorole.replies.message.mastermind.description', interaction))
                            ]
                        }
                    }
                ]
            }
        });

        if (message === 'cancel' || message === "time's up" || message === 'error') return;
        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.autorole.replies.message.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.autorole.replies.message.confirm.description', interaction, {
                        url: message.url
                    })
                )
        }).catch(log4js.trace);
        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);

        confirmation.interaction.deferUpdate().catch(log4js.trace);
        const roles = await RoleReactConfigPanel.process({
            channel: message.channel as TextChannel,
            interaction
        });

        if (roles === 'cancel')
            return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
        roles.button.deferUpdate().catch(() => {});

        await rolesReact
            .fromMessage({
                message: message as Message<true>,
                roles: roles.roles,
                title: (message.embeds ?? [])[0]?.title ?? options.getString('titre'),
                description: resizeString({
                    str: (message.embeds ?? [])[0]?.description ?? options.getString('description'),
                    length: 4096
                })
            })
            .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.autorole.replies.message.created.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.autorole.replies.message.created.description', interaction, {
                                url: message.url,
                                channel: pingChan(message.channel.id)
                            })
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
    }
});
