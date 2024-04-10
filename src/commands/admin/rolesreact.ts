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

export default new DraverCommand({
    name: 'autorole',
    module: 'administration',
    description: 'Gère les rôles à réaction',
    options: [
        {
            name: 'créer',
            description: 'Créer un paneau de rôles à réactions',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'construction',
                    description: 'Construit le panneau de rôles',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'titre',
                            description: "Titre donné à l'embed",
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 256
                        },
                        {
                            name: 'description',
                            description: "Description de l'embed",
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 4096
                        },
                        {
                            name: 'salon',
                            description: 'Salon dans lequel le paneau sera envoyé',
                            required: true,
                            type: ApplicationCommandOptionType.Channel,
                            channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
                        },
                        {
                            name: 'image',
                            description: "Image donnée à l'embed",
                            required: false,
                            type: ApplicationCommandOptionType.Attachment
                        }
                    ]
                },
                {
                    name: 'message',
                    description: 'Créer un panneau de rôle sur un message qui existe déjà',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'titre',
                            description: "Titre du panneau (si il n'y a pas d'embed)",
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 256
                        },
                        {
                            name: 'description',
                            description: "Description du panneau (si il n'y a pas d'embed)",
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 4096
                        }
                    ]
                }
            ]
        },
        {
            name: 'supprimer',
            description: "Supprime un panel d'autorole",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'panneau',
                    description: 'Panneau que vous voulez supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'liste',
            description: 'Affiche la liste des rôles à réaction',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'panneau',
                    type: ApplicationCommandOptionType.Integer,
                    required: false,
                    autocomplete: true,
                    description: 'Panneau que vous voulez afficher en détails'
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
                            .setTitle('Image invalide')
                            .setDescription(`Veuillez envoyer une image valide`)
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
                        .setTitle('Panneau crée')
                        .setDescription(`Le paneau a été crée dans ${pingChan(channel)}`)
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
                .setTitle('Suppression')
                .setDescription(
                    `Êtes-vous sûr de vouloir supprimer le panneau ${resizeString({
                        str: panel.title,
                        length: 50
                    })} ?\nLe message sera supprimé.`
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
                        .setTitle('Supprimé')
                        .setDescription(`Le panneau ${resizeString({ str: panel.title, length: 50 })} a été supprimé`)
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
                            .setTitle(`Panneau ${resizeString({ str: panel.title, length: 100 })}`)
                            .setFields(
                                { name: 'Salon', value: pingChan(panel.channel_id), inline: true },
                                {
                                    name: 'Rôles (bouttons)',
                                    value:
                                        roles.button.length === 0
                                            ? 'Aucun rôle boutton'
                                            : roles.button.map((x) => `${x.emoji} ${pingRole(x.role_id)}`).join('\n'),
                                    inline: true
                                },
                                {
                                    name: 'Rôles (menu)',
                                    value:
                                        roles.menus.length === 0
                                            ? 'Aucun rôle menu'
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
                .setTitle('Rôles à réaction')
                .setDescription(
                    `Il y a **${numerize(list.size)}** panneau${plurial(list.size, {
                        plurial: 'x'
                    })} de rôles à réaction sur ${interaction.guild.name}`
                );
        const mapper = (embed: EmbedBuilder, item: RoleReact) =>
            embed.addFields({
                name: resizeString({ str: item.title, length: 100 }),
                value: `${numerize(item.ids.length)} rôle${plurial(item.ids)} ( ${numerize(
                    item.ids.filter((x) => x.type === 'buttons').length
                )} boutton${plurial(item.ids.filter((x) => x.type === 'buttons').length)}, ${numerize(
                    item.ids.filter((x) => x.type === 'selectmenu').length
                )} menu${plurial(item.ids.filter((x) => x.type === 'selectmenu').length)} ) dans ${pingChan(
                    item.channel_id
                )}`
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
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Salon invalide')
                                    .setDescription(
                                        `Le salon que vous avez fournit n'est pas un salon valide\nVeuillez préciser un salon textuel`
                                    )
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
                                    .setTitle('Auteur invalide')
                                    .setDescription(
                                        `Ce n'est pas moi qui ai envoyé ce mesage\nIl faut que l'auteur du message soi moi-même, sinon je ne pourrais pas ajouter les boutons`
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !ticketsManager.isTicket(m.id) && !ticketsManager.panels.get(m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Ticket')
                                    .setDescription(
                                        `Ce message fait partie du système de tickets.\nVeuillez envoyer un message qui ne fait partie d'aucun système de Draver`
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !giveaways.map.giveaways.has(m.id) && !giveaways.map.ended.has(m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Giveaway')
                                    .setDescription(
                                        `Ce message fait partie du système de giveaway\nVeuillez en choisir un autre si il vous plait`
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !tasksManager.cache.find((x) => x.data.message_id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Tâche')
                                    .setDescription(
                                        `Ce message est une tâche, vous ne pouvez remplacer une tâche par un panneau de rôles à réactions`
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !rolesReact.cache.find((x) => x.message_id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Rôels à réaction')
                                    .setDescription(
                                        `Ce message est un panneau de rôles à réactions\nVeuillez choisir un autre message`
                                    )
                            ]
                        }
                    },
                    {
                        check: (m) => !masterminds.find((x) => x.message.id === m.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Mastermind')
                                    .setDescription(`Ce message est une partie de Mastermind`)
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
                .setTitle('Rôles à réaction')
                .setDescription(
                    `Êtes-vous sûr de vouloir mettre le panneau sur [ce message](${message.url}) ?\nLes boutons actuels (si il y en a) seront supprimés et remplacés par ceux du panneau`
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
                        .setTitle('Panneau crée')
                        .setDescription(
                            `Le panneau a été crée sur [ce message](${message.url}) dans ${pingChan(
                                message.channel.id
                            )}`
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
    }
});
