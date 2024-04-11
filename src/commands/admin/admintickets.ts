import { modulesManager, ticketsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, GuildMember, TextChannel, User } from 'discord.js';
import {
    basicEmbed,
    capitalize,
    confirm,
    evokerColor,
    getMsgUrl,
    numerize,
    pagination,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    resizeString,
    subcmd
} from '../../utils/toolbox';
import replies from '../../data/replies';
import { ticketChannels } from '../../typings/database';
import { confirmReturn } from '../../typings/functions';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.tickets'),
    module: 'administration',
    permissions: ['Administrator'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.admins.tickets.options.list'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.tickets.options.list.options.user'),
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.tickets.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.tickets.options.create.options.subject'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.tickets.options.create.options.channel'),
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    ...translator.commandData('commands.admins.tickets.options.create.options.description'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.tickets.options.create.options.image'),
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.tickets.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.tickets.options.delete.options.id'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.tickets.options.modroles'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.tickets.options.modroles.options.list'),
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    ...translator.commandData('commands.admins.tickets.options.modroles.options.add'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData(
                                'commands.admins.tickets.options.modroles.options.add.options.role'
                            ),
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.tickets.options.modroles.options.remove'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData(
                                'commands.admins.tickets.options.modroles.options.remove.options.role'
                            ),
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'tickets'))
        return interaction
            .reply({
                embeds: [
                    replies.moduleDisabled(interaction.user, {
                        guild: interaction.guild,
                        module: 'tickets',
                        lang: interaction
                    })
                ],
                ephemeral: true
            })
            .catch(() => {});

    const cmd = subcmd(options);

    if (options.data.filter((x) => x.type === ApplicationCommandOptionType.SubcommandGroup).length === 0) {
        if (cmd === 'liste') {
            const list = ticketsManager.getTicketsList(interaction.guild.id).toJSON();

            if (list.length === 0)
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(
                                    translator.translate(
                                        'commands.admins.tickets.replies.list.noTickets.title',
                                        interaction
                                    )
                                )
                                .setDescription(
                                    translator.translate(
                                        'commands.admins.tickets.replies.list.noTickets.description',
                                        interaction
                                    )
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            const user = options.getUser('utilisateur') as User;
            if (user && !user.bot) {
                const ticket = list.find((x) => x.user_id === user.id);

                if (!ticket)
                    return interaction
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user)
                                    .setTitle(
                                        translator.translate(
                                            'commands.admins.tickets.replies.list.userNoTickets.title',
                                            interaction
                                        )
                                    )
                                    .setDescription(
                                        translator.translate(
                                            'commands.admins.tickets.replies.list.userNoTickets.description',
                                            interaction,
                                            { user: pingUser(user) }
                                        )
                                    )
                                    .setColor(evokerColor(interaction.guild))
                            ]
                        })
                        .catch(() => {});

                interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle(
                                    translator.translate(
                                        'commands.admins.tickets.replies.list.user.title',
                                        interaction,
                                        { name: user.username }
                                    )
                                )
                                .setDescription(
                                    translator.translate(
                                        'commands.admins.tickets.replies.list.user.description',
                                        interaction,
                                        { user: pingUser(user) }
                                    )
                                )
                                .setFields(
                                    {
                                        name: translator.translate(
                                            'commands.admins.tickets.replies.list.user.channel',
                                            interaction
                                        ),
                                        value: pingChan(ticket.channel_id),
                                        inline: true
                                    },
                                    {
                                        name: translator.translate(
                                            'commands.admins.tickets.replies.list.user.state',
                                            interaction
                                        ),
                                        value: capitalize(
                                            translator.translate(
                                                `commands.admins.tickets.utils.states.${ticket.state}`,
                                                interaction
                                            )
                                        ),
                                        inline: true
                                    }
                                )
                        ]
                    })
                    .catch(() => {});
                return;
            }

            const states = {
                open: translator.translate('commands.admins.tickets.utils.states.open', interaction),
                closed: translator.translate('commands.admins.tickets.utils.states.closed', interaction)
            };
            const basic = () => {
                return basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.admins.tickets.replies.list.list.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.tickets.replies.list.list.description', interaction, {
                            count: list.length
                        })
                    );
            };
            const map = (embed: EmbedBuilder, ticket: ticketChannels) => {
                return embed.addFields({
                    name: ticket.channelName,
                    value: translator.translate('commands.admins.tickets.replies.list.list.mapper', interaction, {
                        user: pingUser(ticket.user_id),
                        channel: pingChan(ticket.channel_id),
                        state: states[ticket.state]
                    }),
                    inline: false
                });
            };

            if (list.length <= 5) {
                const embed = basic();
                for (const ticket of list) {
                    map(embed, ticket);
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
                    user: interaction.user,
                    embeds
                });
            }
        }
        if (cmd === 'créer') {
            const subject = options.getString('sujet');
            const description = options.getString('description');
            const img = options.getAttachment('image');
            const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;

            if (img && !img.contentType.includes('image'))
                return interaction
                    .reply({
                        embeds: [replies.invalidImage(interaction.member as GuildMember, interaction)],
                        ephemeral: true
                    })
                    .catch(() => {});

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user, { questionMark: true })
                    .setTitle(
                        translator.translate('commands.admins.tickets.replies.create.creation.title', interaction)
                    )
                    .setDescription(
                        translator.translate(
                            'commands.admins.tickets.replies.create.creation.description',
                            interaction,
                            { channel: pingChan(channel) }
                        )
                    )
                    .setFields(
                        {
                            name: translator.translate(
                                'commands.admins.tickets.replies.create.creation.fields.subject',
                                interaction
                            ),
                            value: resizeString({ str: subject, length: 200 }),
                            inline: true
                        },
                        {
                            name: translator.translate(
                                'commands.admins.tickets.replies.create.creation.fields.description.name',
                                interaction
                            ),
                            value: description
                                ? resizeString({ str: description, length: 200 })
                                : translator.translate(
                                      'commands.admins.tickets.replies.create.creation.fields.description.none',
                                      interaction
                                  ),
                            inline: false
                        },
                        {
                            name: translator.translate(
                                'commands.admins.tickets.replies.create.creation.fields.image.name',
                                interaction
                            ),
                            value: translator.translate(
                                `commands.admins.tickets.replies.create.creation.fields.image.${!!img ? 'link' : 'none'}`,
                                interaction,
                                {
                                    link: img?.url
                                }
                            )
                        }
                    )
            }).catch(() => {})) as confirmReturn;

            if (confirmation === 'cancel' || !confirmation?.value)
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

            const rep = (await ticketsManager
                .createPanel({
                    guild: interaction.guild,
                    channel,
                    subject,
                    description,
                    image: img?.url,
                    user: interaction.user,
                    lang: interaction.guild.preferredLocale ?? translator.defaultLang
                })
                .catch(() => {})) as { embed: EmbedBuilder };

            interaction
                .editReply({
                    embeds: [rep.embed]
                })
                .catch(() => {});
        }
        if (cmd === 'supprimer') {
            const id = options.getString('identifiant');

            const panel = ticketsManager
                .getPanelsList(interaction.guild.id)
                .toJSON()
                .find((x) => x.message_id === id);
            if (!panel)
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setColor(evokerColor(interaction.guild))
                                .setTitle(
                                    translator.translate(
                                        'commands.admins.tickets.replies.delete.noPanel.title',
                                        interaction
                                    )
                                )
                                .setDescription(
                                    translator.translate(
                                        'commands.admins.tickets.replies.delete.noPanel.description',
                                        interaction
                                    )
                                )
                        ]
                    })
                    .catch(() => {});

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle(
                        translator.translate('commands.admins.tickets.replies.delete.deleting.title', interaction)
                    )
                    .setDescription(
                        translator.translate(
                            'commands.admins.tickets.replies.delete.deleting.description',
                            interaction,
                            { link: getMsgUrl(panel) }
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
            await interaction
                .editReply({
                    embeds: [replies.wait(interaction.user, confirmation.interaction)],
                    components: []
                })
                .catch(() => {});

            const res = await ticketsManager.deletePanel({
                guild: interaction.guild,
                user: interaction.user,
                message_id: id,
                lang: interaction
            });
            interaction
                .editReply({
                    embeds: [res?.embed]
                })
                .catch(() => {});
        }
    } else {
        if (cmd === 'liste') {
            const { roles } = ticketsManager.getServerModroles(interaction.guild.id);

            if (roles.length === 0)
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(
                                    translator.translate(
                                        'commands.admins.tickets.replies.modroles.list.no.title',
                                        interaction
                                    )
                                )
                                .setDescription(
                                    translator.translate(
                                        'comands.admins.tickets.replies.modroles.list.no.description',
                                        interaction,
                                        { name: interaction.guild.name }
                                    )
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.tickets.replies.modroles.list.list.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.tickets.replies.modroles.list.list.description',
                                    interaction,
                                    {
                                        count: roles.length,
                                        roles: roles.map(pingRole).join(' ')
                                    }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
        if (cmd === 'ajouter') {
            const role = options.getRole('rôle');
            if (role.position >= (interaction.member as GuildMember).roles.highest.position)
                return interaction
                    .reply({
                        embeds: [replies.roleTooHigh(interaction.member as GuildMember, role.id, interaction)],
                        ephemeral: true
                    })
                    .catch(() => {});

            ticketsManager.addModRole({
                guild_id: interaction.guild.id,
                role_id: role.id
            });

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                translator.translate('commands.admins.tickets.replies.modroles.add.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.tickets.replies.modroles.add.description',
                                    interaction,
                                    {
                                        role: pingRole(role.id)
                                    }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
        if (cmd === 'retirer') {
            const role = options.getRole('rôle');
            if (role.position >= (interaction.member as GuildMember).roles.highest.position)
                return interaction
                    .reply({
                        embeds: [replies.roleTooHigh(interaction.member as GuildMember, role.id, interaction)],
                        ephemeral: true
                    })
                    .catch(() => {});

            ticketsManager.addModRole({
                guild_id: interaction.guild.id,
                role_id: role.id
            });

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                translator.translate(
                                    'commands.admins.tickets.replies.modroles.remove.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.tickets.replies.modroles.remove.description',
                                    interaction,
                                    { role: pingRole(role.id) }
                                )
                            )
                    ]
                })
                .catch(() => {});
        }
    }
});
