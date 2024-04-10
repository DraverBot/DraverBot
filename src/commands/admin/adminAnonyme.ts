import { AnonymousManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction, waitForMessage } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    ButtonInteraction,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    Message,
    TextChannel
} from 'discord.js';
import {
    basicEmbed,
    buildButton,
    confirm,
    evokerColor,
    hint,
    numerize,
    pagination,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    row,
    subcmd,
    waitForReplies
} from '../../utils/toolbox';
import { AnonymousValue } from '../../managers/Anonymous';
import { cancelButton } from '../../data/buttons';
import replies from '../../data/replies';
import { confirmReturn } from '../../typings/functions';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.anonyme'),
    module: 'config',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    options: [
        {
            ...translator.commandData('commands.admins.anonyme.options.configurer'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.anonyme.options.configurer.options.channel'),
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText],
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.anonyme.options.configurer.options.nom'),
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.anonyme.options.liste'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.anonyme.options.salon'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.anonyme.options.salon.options.salon'),
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channel_types: [ChannelType.GuildText]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.anonyme.options.bannissements'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.anonyme.options.bannissements.options.salon'),
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.anonyme.options.supprimer'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.anonyme.options.supprimer.options.salon'),
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                    required: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'configurer') {
        const channel = options.getChannel('salon') as TextChannel;
        const name = options.getString('nom') ?? 'Anonyme';

        if (AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.configurer.replies.configured.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.configurer.replies.configured.description',
                                    interaction,
                                    { channel: pingChan(channel) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await interaction.deferReply().catch(() => {});
        const result = await AnonymousManager.create({
            guild: interaction.guild,
            channel,
            name
        }).catch(() => {});

        if (result === 'webhook creation failed')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.configurer.replies.webhookFailed.description',
                                    interaction,
                                    { channel: pingChan(channel) }
                                )
                            )
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.configurer.replies.webhookFailed.title',
                                    interaction
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate(
                                'commands.admins.anonyme.options.configurer.replies.create.title',
                                interaction
                            )
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.anonyme.options.configurer.replies.create.description',
                                interaction,
                                { channel: pingChan(channel) }
                            )
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'liste') {
        const list = AnonymousManager.values.filter((x) => x.data.guild_id === interaction.guild.id).toJSON();
        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.liste.replies.noChannel.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.liste.replies.noChannel.description',
                                    interaction
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const map = (embed: EmbedBuilder, { data, bannedRoles, bannedUsers }: AnonymousValue) => {
            return embed.addFields({
                name: data.name,
                value: translator.translate('commands.admins.anonyme.options.liste.replies.mapper', interaction, {
                    channel: pingChan(data.channel_id),
                    bannedRoles: bannedRoles?.length ?? 0,
                    bannedUsers: bannedUsers?.length ?? 0
                }),
                inline: false
            });
        };
        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.anonyme.options.liste.replies.list.title', interaction))
                .setDescription(
                    translator.translate(
                        'commands.admins.anonyme.options.liste.replies.list.description',
                        interaction,
                        {
                            channels: list.length
                        }
                    )
                );
        };

        if (list.length <= 5) {
            const embed = basic();

            for (const l of list) {
                map(embed, l);
            }

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds = [basic()];

            list.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                map(embeds[embeds.length - 1], v);
            });

            pagination({
                interaction,
                embeds,
                user: interaction.user
            });
        }
    }
    if (cmd === 'salon') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate('commands.admins.anonyme.replies.notAnonymous.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.replies.notAnonymous.description',
                                    interaction,
                                    { channel: pingChan(channel) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = AnonymousManager.values.find((x) => x.data.channel_id === channel.id);

        const none = translator.translate('commands.admins.anonyme.options.salon.replies.info.none', interaction);
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate(
                                'commands.admins.anonyme.options.salon.replies.info.title',
                                interaction
                            )
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.anonyme.options.salon.replies.info.description',
                                interaction,
                                { channel: pingChan(channel), name: data.data.name }
                            )
                        )
                        .setFields(
                            {
                                name: translator.translate(
                                    'commands.admins.anonyme.options.salon.replies.info.roles',
                                    interaction,
                                    { roles: data.bannedRoles.length }
                                ),
                                value: data.bannedRoles.length > 0 ? data.bannedRoles.map(pingRole).join(' ') : none,
                                inline: false
                            },
                            {
                                name: translator.translate(
                                    'commands.admins.anonyme.options.salon.replies.info.users',
                                    interaction,
                                    { users: data.bannedUsers.length }
                                ),
                                value: data.bannedUsers.length > 0 ? data.bannedUsers.map(pingUser).join(' ') : none,
                                inline: true
                            }
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'bannissements') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate('commands.admins.anonyme.replies.notAnonymous.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.replies.notAnonymous.description',
                                    interaction,
                                    { channel: pingChan(channel) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = AnonymousManager.values.find((x) => x.data.channel_id === channel.id);

        const btn = (str: string) =>
            translator.translate(`commands.admins.anonyme.options.bannissements.buttons.${str}`, interaction);
        const msg = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user, { questionMark: true })
                    .setTitle(
                        translator.translate(
                            'commands.admins.anonyme.options.bannissements.replies.control.title',
                            interaction
                        )
                    )
                    .setDescription(
                        translator.translate(
                            'commands.admins.anonyme.options.bannissements.replies.control.description',
                            interaction,
                            { channel: pingChan(channel) }
                        )
                    )
            ],
            fetchReply: true,
            components: [
                row(
                    buildButton({ label: btn('addRole'), style: 'Primary', id: 'addRole' }),
                    buildButton({
                        label: btn('removeRole'),
                        style: 'Secondary',
                        id: 'removeRole'
                    })
                ),
                row(
                    buildButton({
                        label: btn('addUser'),
                        style: 'Primary',
                        id: 'addUser'
                    }),
                    buildButton({
                        label: btn('removeUser'),
                        style: 'Secondary',
                        id: 'removeUser'
                    })
                ),
                row(cancelButton(interaction))
            ]
        })) as Message<true>;

        const choice = (await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: interaction.user,
            replies: waitForReplies(interaction.client, interaction)
        }).catch(() => {})) as ButtonInteraction;

        if (!choice || choice.customId === 'cancel')
            return interaction
                .editReply({
                    components: [],
                    embeds: [replies.cancel(interaction)]
                })
                .catch(() => {});

        if (choice.customId === 'addUser') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.add',
                                    interaction
                                )
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(() => {});

            const user = rep.mentions.users.first() || interaction.guild.members.cache.get(rep.content)?.user;
            if (!user)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('contents.global.embeds.noUser.title', interaction))
                                .setDescription(
                                    translator.translate('contents.global.embeds.noUser.description', interaction)
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            AnonymousManager.addBannedUser(data.data.id.toString(), user.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                `${translator.translate('commands.admins.anonyme.options.bannissements.replies.user.title', interaction)} ${translator.translate('commands.admins.anonyme.options.bannissements.replies.user.suffixes.added', interaction)}`
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.added',
                                    interaction,
                                    { channel: pingChan(channel), user: pingUser(user) }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'addRole') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.add',
                                    interaction
                                )
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(() => {});

            const role = rep.mentions.roles.first() || interaction.guild.roles.cache.get(rep.content);
            if (!role)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('contents.global.embeds.noRole.title', interaction))
                                .setDescription(
                                    translator.translate('contents.global.embeds.noRole.description', interaction)
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            AnonymousManager.addBannedRole(data.data.id.toString(), role.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                `${translator.translate('commands.admins.anonyme.options.bannissements.replies.role.title', interaction)} ${translator.translate('commands.admins.anonyme.options.bannissements.replies.role.suffixes.added', interaction)}`
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.added',
                                    interaction,
                                    { channel: pingChan(channel), role: pingRole(role) }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'removeUser') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.remove',
                                    interaction
                                )
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(() => {});

            const user = rep.mentions.users.first() || interaction.guild.members.cache.get(rep.content)?.user;
            if (!user)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('contents.global.embeds.noUser.title', interaction))
                                .setDescription(
                                    translator.translate('contents.global.embeds.noUser.description', interaction)
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            AnonymousManager.removeBannedUser(data.data.id.toString(), user.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                `${translator.translate('commands.admins.anonyme.options.bannissements.replies.user.title', interaction)} ${translator.translate('commands.admins.anonyme.options.bannissements.replies.user.suffixes.removed', interaction)}`
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.user.removed',
                                    interaction,
                                    { channel: pingChan(channel), user: pingUser(user) }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'removeRole') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.remove',
                                    interaction
                                )
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(() => {});

            const role = rep.mentions.roles.first() || interaction.guild.roles.cache.get(rep.content);
            if (!role)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(translator.translate('contents.global.embeds.noRole.title', interaction))
                                .setDescription(
                                    translator.translate('contents.global.embeds.noRole.description', interaction)
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            AnonymousManager.removeBannedRole(data.data.id.toString(), role.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                `${translator.translate('commands.admins.anonyme.options.bannissements.replies.role.title', interaction)} ${translator.translate('commands.admins.anonyme.options.bannissements.replies.role.suffixes.removed', interaction)}`
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.options.bannissements.replies.role.removed',
                                    interaction,
                                    { channel: pingChan(channel), role: pingRole(role) }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate('commands.admins.anonyme.replies.notAnonymous.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.anonyme.replies.notAnonymous.description',
                                    interaction,
                                    { channel: pingChan(channel) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = AnonymousManager.values.find((x) => x.data.channel_id === channel.id);
        const confirmation = (await confirm({
            interaction: interaction,
            embed: basicEmbed(interaction.user)
                .setTitle(
                    translator.translate(
                        'commands.admins.anonyme.options.supprimer.replies.suppression.title',
                        interaction
                    )
                )
                .setDescription(
                    translator.translate(
                        'commands.admins.anonyme.options.supprimer.replies.suppression.description',
                        interaction,
                        { channel: pingChan(channel) }
                    )
                ),
            user: interaction.user
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate(
                                'commands.admins.anonyme.options.supprimer.replies.suppressed.title',
                                interaction
                            )
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.anonyme.options.supprimer.replies.suppressed.description',
                                interaction,
                                { channel: pingChan(channel) }
                            )
                        )
                ],
                components: []
            })
            .catch(() => {});
        AnonymousManager.delete(data.data.id.toString()).catch(() => {});
    }
});
