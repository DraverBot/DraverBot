import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    TextChannel
} from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import {
    basicEmbed,
    buildButton,
    confirm,
    numerize,
    pagination,
    pingChan,
    pingRole,
    plurial,
    resizeString,
    row
} from '../utils/toolbox';
import { roleReactButtonType } from '../typings/rolereact';
import { ButtonIds } from '../typings/buttons';
import RoleReactAdd from '../process/RoleReactAdd';
import GetValidRole from '../process/GetValidRole';
import replies from '../data/replies';
import SetRandomComponent from '../process/SetRandomComponent';
import { RoleReact } from '../structures/RoleReact';

export default new AmethystCommand({
    name: 'autorole',
    description: 'Gère les rôles à réaction',
    options: [
        {
            name: 'créer',
            description: 'Créer un paneau de rôles à réactions',
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
    if (cmd === 'créer') {
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

        const roles: roleReactButtonType[] = [];
        const embed = () => {
            const btnRoles = roles.filter((x) => x.type === 'buttons');
            const menuRoles = roles.filter((x) => x.type === 'selectmenu');
            return basicEmbed(interaction.user, { questionMark: true })
                .setTitle('Rôles à réaction')
                .setDescription(
                    `Vous êtes en train de configurer le panneau de rôles à réaction qui sera envoyé dans ${pingChan(
                        channel
                    )}`
                )
                .setFields(
                    {
                        name: 'Rôles (bouttons)',
                        value:
                            btnRoles.length === 0
                                ? 'Pas de rôles'
                                : btnRoles
                                      .map((x) => `${x.emoji ? x.emoji : ''} ${x.name} ( ${pingRole(x.role_id)} )`)
                                      .join('\n') ?? 'Pas de rôles',
                        inline: true
                    },
                    {
                        name: 'Rôles (menu)',
                        value:
                            menuRoles.length === 0
                                ? 'Pas de rôles'
                                : menuRoles
                                      .map((x) => `${x.emoji ? x.emoji : ''} ${x.name} ( ${pingRole(x.role_id)} )`)
                                      .join('\n'),
                        inline: true
                    }
                );
        };
        const components = (disabled = false) => {
            const calculateIfValid = () => {
                const totalBtns = roles.filter((x) => x.type === 'buttons').length;
                const totalMenus = roles.filter((x) => x.type === 'selectmenu').length;

                const btnRows = Math.ceil(totalBtns / 5);
                const menuRows = Math.ceil(totalMenus / 25);

                const maxLength = btnRows + menuRows === 0 ? 1 : btnRows * 5 + menuRows * 25;
                return roles.length === maxLength;
            };
            return [
                row(
                    buildButton({
                        label: 'Ajouter un bouton',
                        disabled: calculateIfValid() || disabled,
                        style: 'Primary',
                        buttonId: 'RoleReactAdd'
                    }),
                    buildButton({
                        label: 'Supprimer un bouton',
                        disabled: roles.length === 0 || disabled,
                        style: 'Secondary',
                        buttonId: 'RoleReactRemove'
                    }),
                    buildButton({
                        label: 'Annuler',
                        style: 'Danger',
                        buttonId: 'RoleReactsCancel',
                        disabled: disabled
                    }),
                    buildButton({
                        label: 'Valider',
                        disabled: roles.length === 0 || disabled,
                        style: 'Success',
                        buttonId: 'RoleReactsOk'
                    })
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
            componentType: ComponentType.Button,
            time: 600000
        });
        collector.on('collect', async (ctx) => {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    embeds: [
                        basicEmbed(ctx.user, { evoker: interaction.guild })
                            .setTitle('Interaction refusée')
                            .setDescription(`Vous n'avez pas le droit d'interagir avec cette interaction`)
                    ],
                    ephemeral: true,
                    components: SetRandomComponent.process()
                }).catch(log4js.trace);
                return;
            }
            if (ctx.customId === ButtonIds.RoleReactAdd) {
                await RoleReactAdd.process({
                    interaction,
                    message: panel,
                    ctx,
                    embedGenerator: embed,
                    componentGenerator: components,
                    roles
                });

                ctx.deleteReply().catch(log4js.trace);
                panel
                    .edit({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.RoleReactRemove) {
                panel
                    .edit({
                        components: components(true)
                    })
                    .catch(log4js.trace);
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { questionMark: true })
                                .setTitle('Rôle')
                                .setDescription(
                                    `Quel rôle voulez-vous retirer ?\nRépondez dans le chat par un **nom**, un **identifiant** ou une **mention**`
                                )
                        ],
                        fetchReply: true
                    })
                    .catch(log4js.trace)) as Message<true>;
                if (!rep) {
                    panel.edit({ components: components() }).catch(log4js.trace);
                    return;
                }

                const role = await GetValidRole.process({
                    message: rep,
                    user: interaction.user,
                    allowCancel: true,
                    time: 120000,
                    checks: [
                        {
                            check: (r) => !!roles.find((x) => x.role_id === r.id),
                            reply: {
                                embeds: [
                                    basicEmbed(interaction.user, { evoker: interaction.guild })
                                        .setTitle('Rôle non-ajouté')
                                        .setDescription(`Ce rôle n'a pas été ajouté en réaction`)
                                ]
                            }
                        }
                    ]
                });

                if (role === 'cancel' || role === "time's up") {
                    ctx.deleteReply(rep).catch(log4js.trace);
                    panel.edit({ components: components() }).catch(log4js.trace);
                    return;
                }

                const confirmation = await confirm({
                    interaction: ctx,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Retrait')
                        .setDescription(`Êtes-vous sûr de vouloir retirer le rôle ${pingRole(role)} ?`),
                    user: interaction.user
                }).catch(log4js.trace);
                ctx.deleteReply().catch(log4js.trace);

                if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                    panel.edit({ components: components() }).catch(log4js.trace);
                    return;
                }
                roles.splice(roles.indexOf(roles.find((x) => x.role_id === role.id)), 1);
                panel.edit({ components: components(), embeds: [embed()] }).catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.RoleReactsCancel) {
                panel.edit({ components: components(true) }).catch(log4js.trace);
                const confirmation = await confirm({
                    interaction: ctx,
                    user: interaction.user,
                    ephemeral: true,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Annulation')
                        .setDescription(`Êtes-vous sûr de vouloir annuler la création des rôles à réaction ?`)
                }).catch(log4js.trace);

                ctx.deleteReply().catch(log4js.trace);
                if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                    panel.edit({ components: components() }).catch(log4js.trace);
                    return;
                }
                panel
                    .edit({
                        components: [],
                        embeds: [replies.cancel()]
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.RoleReactsOk) {
                panel.edit({ components: components(true) }).catch(log4js.trace);
                const confirmation = await confirm({
                    interaction: ctx,
                    user: interaction.user,
                    ephemeral: true,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Validation')
                        .setDescription(`Êtes-vous sûr de vouloir valider la création des rôles à réaction ?`)
                }).catch(log4js.trace);

                if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                    ctx.deleteReply().catch(log4js.trace);
                    panel.edit({ components: components() }).catch(log4js.trace);
                    return;
                }
                ctx.deleteReply().catch(log4js.trace);

                const creation = await interaction.client.rolesReact.create({
                    title,
                    description,
                    image: img?.url ?? '',
                    channel,
                    user: interaction.user,
                    roles: roles
                });

                if (creation === 'message not found') {
                    interaction
                        .editReply({ embeds: [replies.internalError(interaction.member as GuildMember)] })
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
            }
        });
        // Core
        // await interaction
        //     .reply({
        //         embeds: [replies.wait(interaction.user)]
        //     })
        //     .catch(log4js.trace);
    }
    if (cmd === 'supprimer') {
        const panelId = options.getInteger('panneau');
        const panel = client.rolesReact.getPanel(panelId);

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
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);

        client.rolesReact.delete(panel.id);
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
        if (client.rolesReact.exists(panelId)) {
            const panel = client.rolesReact.getPanel(panelId);

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

        const list = client.rolesReact.getList(interaction.guild.id);
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
});
