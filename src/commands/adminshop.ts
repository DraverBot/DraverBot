import { DraverCommand } from '../structures/DraverCommand';
import { preconditions, waitForInteraction, waitForMessage } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    ButtonInteraction,
    ComponentType,
    GuildMember,
    Message,
    ModalBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import {
    basicEmbed,
    buildButton,
    checkCtx,
    confirm,
    evokerColor,
    hint,
    numerize,
    pingRole,
    random,
    row,
    sendError,
    subcmd,
    systemReply,
    waitForReplies
} from '../utils/toolbox';
import { ShopItemType } from '../typings/database';
import validRole from '../preconditions/validRole';
import { ShopManagerErrorReturns } from '../typings/managers';
import { util } from '../utils/functions';
import { cancelButton } from '../data/buttons';
import replies from '../data/replies';
import { confirmReturn } from '../typings/functions';

export default new DraverCommand({
    name: 'adminmagasin',
    module: 'economy',
    description: 'Configure le magasin du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled, validRole],
    permissions: ['ManageGuild'],
    options: [
        {
            name: 'créer',
            description: 'Créer un item dans le magasin',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: "Nom de l'item",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'prix',
                    description: "Prix de l'item",
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0
                },
                {
                    name: 'type',
                    description: "Type de l'item",
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: 'Rôle',
                            value: 'role'
                        },
                        {
                            name: 'Objet',
                            value: 'item'
                        }
                    ]
                },
                {
                    name: 'quantité',
                    description: "Quantité d'items disponible",
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    name: 'rôle',
                    description: 'Rôle à donner en cas de type rôle',
                    type: ApplicationCommandOptionType.Role,
                    required: false
                }
            ]
        },
        {
            name: 'modifier',
            description: 'Modifie un item',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'item',
                    description: 'Item à modifier',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un item',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'item',
                    description: 'Item à supprimer',
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    required: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const name = options.getString('nom');
        const price = options.getInteger('prix');
        const type = options.getString('type') as ShopItemType;
        const quantity = options.getInteger('quantité') ?? 0;
        const role = options.getRole('rôle');

        await interaction.deferReply().catch(() => {});

        const result = await interaction.client.shop.addItem(interaction.guild.id, {
            name,
            price,
            type,
            roleId: role?.id,
            quantity
        });

        if (result === ShopManagerErrorReturns.ItemAlreadyExist)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Item déjà existant')
                            .setDescription(`Un item du même nom existe déjà sur le serveur`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Item crée')
                        .setDescription(
                            `L'item \`${name}\` a été crée pour **${numerize(price)} ${util('coins')}** en tant ${
                                type === 'item'
                                    ? "qu'objet"
                                    : type === 'role'
                                    ? `que rôle, associé avec le rôle ${pingRole(role.id)},`
                                    : ''
                            } avec un stock ${quantity === 0 ? 'infini' : `de ${numerize(quantity)}`}\n${hint(
                                `Vous pouvez à tout moment modifier un item avec la commande \`/adminmagasin modifier\``
                            )}`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'modifier') {
        const itemId = parseInt(options.getString('item'));
        const item = interaction.client.shop.getShop(interaction.guild.id).find((x) => x.id === itemId);

        const before = item;
        let changes = 0;

        const embed = () => {
            return basicEmbed(interaction.user, { questionMark: true })
                .setTitle("Modification d'item")
                .setDescription(`Appuyez sur les bouttons pour modifier l'item`)
                .setFields(
                    {
                        name: 'Nom',
                        value: item.itemName,
                        inline: true
                    },
                    {
                        name: 'Prix',
                        value: `${numerize(item.price)} ${util('coins')}`,
                        inline: true
                    },
                    {
                        name: 'Type',
                        value: item.itemType === 'item' ? 'Objet' : item.itemType === 'role' ? 'Rôle' : 'Inconnu',
                        inline: false
                    },
                    {
                        name: 'Quantité',
                        value: item.quantity === 0 ? 'Infinie' : numerize(item.quantity),
                        inline: true
                    },
                    {
                        name: 'Quantité disponible',
                        value: item.quantity === 0 ? 'Infinie' : numerize(item.quantityLeft),
                        inline: true
                    },
                    {
                        name: 'Rôle donné',
                        value:
                            item.roleId.length > 1 && item.itemType === 'role' ? pingRole(item.roleId) : 'Pas de rôle'
                    }
                );
        };
        const components = (fullDisable = false) => {
            return [
                row(
                    buildButton({
                        label: 'Nom',
                        style: 'Primary',
                        id: 'name',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: 'Prix',
                        style: 'Primary',
                        id: 'price',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: 'Type',
                        style: 'Secondary',
                        id: 'type',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: 'Quantité',
                        style: 'Success',
                        id: 'quantity',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: 'Quantité disponible',
                        style: 'Danger',
                        id: 'quantityLeft',
                        disabled: fullDisable
                    })
                ),
                row(
                    buildButton({
                        label: 'Rôle',
                        style: 'Primary',
                        id: 'role',
                        disabled: item.itemType !== 'role' || fullDisable
                    }),
                    buildButton({
                        label: 'Valider',
                        style: 'Success',
                        id: 'valider',
                        disabled: changes === 0 || (item.itemType === 'role' && item.roleId.length < 1) || fullDisable
                    }),
                    cancelButton().setDisabled(fullDisable)
                )
            ];
        };

        const panel = (await interaction
            .reply({
                embeds: [embed()],
                components: components(),
                fetchReply: true
            })
            .catch(sendError)) as Message<true>;

        if (!panel)
            return systemReply(interaction, {
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Envoi impossible')
                        .setDescription(`L'envoi a été annulé`)
                        .setColor(evokerColor(interaction.guild))
                ]
            });

        const collector = panel.createMessageComponentCollector({
            time: 180000
        });

        collector.on('collect', async (ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;

            if (!['cancel', 'valider'].includes(ctx.customId)) changes++;

            if (ctx.customId === 'cancel') return collector.stop('cancel');
            if (ctx.customId === 'valider') return collector.stop('valider');

            if (ctx.customId === 'name') {
                await ctx
                    .showModal(
                        new ModalBuilder()
                            .setTitle("Modification d'item")
                            .setCustomId('edit')
                            .setComponents(
                                row<TextInputBuilder>(
                                    new TextInputBuilder()
                                        .setLabel('Nom')
                                        .setPlaceholder("Nom de l'objet")
                                        .setMaxLength(255)
                                        .setRequired(true)
                                        .setCustomId('name')
                                        .setStyle(TextInputStyle.Short)
                                )
                            )
                    )
                    .catch(sendError);
                const reply = await ctx
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(sendError);

                if (!reply) {
                    changes--;
                    return;
                }
                const name = reply.fields.getTextInputValue('name');
                reply.deferUpdate().catch(sendError);

                item.itemName = name;
                panel
                    .edit({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(() => {});
            }
            if (['price', 'quantity', 'quantityLeft'].includes(ctx.customId)) {
                const label = {
                    price: 'Prix',
                    quantity: 'Quantité',
                    quantityLeft: 'Quantité restante'
                };

                await ctx.showModal(
                    new ModalBuilder()
                        .setTitle("Modification d'item")
                        .setCustomId('edit')
                        .setComponents(
                            row<TextInputBuilder>(
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setLabel(label[ctx.customId])
                                    .setPlaceholder(random({ max: 1139, min: 5691 }).toString())
                                    .setRequired(true)
                                    .setCustomId('value')
                            )
                        )
                );
                const reply = await ctx
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(() => {});
                if (!reply) {
                    changes--;
                    return;
                }

                const price = parseInt(reply.fields.getTextInputValue('value'));
                if (!price || isNaN(price)) {
                    changes--;
                    reply
                        .reply({
                            embeds: [replies.invalidNumber(interaction.member as GuildMember)],
                            ephemeral: true
                        })
                        .catch(() => {});
                    return;
                }
                reply.deferUpdate().catch(() => {});

                item[ctx.customId] = Math.abs(price);
                if (ctx.customId === 'quantityLeft' && price > item.quantity) item.quantityLeft = item.quantity;

                panel
                    .edit({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(() => {});
            }
            if (ctx.customId === 'type') {
                await panel
                    .edit({
                        components: components(true)
                    })
                    .catch(() => {});
                const buttons = () => {
                    return [
                        row(
                            buildButton({
                                label: 'Objet',
                                style: 'Primary',
                                id: 'item',
                                disabled: item.itemType === 'item'
                            }),
                            buildButton({
                                label: 'Rôle',
                                style: 'Secondary',
                                id: 'role',
                                disabled: item.itemType === 'role'
                            }),
                            cancelButton()
                        )
                    ];
                };
                const question = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { questionMark: true })
                                .setTitle('Type')
                                .setDescription(`Quel est le nouveau type de l'item ?`)
                        ],
                        fetchReply: true,
                        ephemeral: true,
                        components: buttons()
                    })
                    .catch(() => {})) as Message<true>;
                if (!question) {
                    changes--;
                    panel
                        .edit({
                            components: components()
                        })
                        .catch(() => {});
                    return;
                }

                const reply = (await waitForInteraction({
                    user: interaction.user,
                    componentType: ComponentType.Button,
                    message: question,
                    replies: waitForReplies(interaction.client)
                }).catch(() => {})) as ButtonInteraction;

                if (!reply || reply.customId === 'cancel') {
                    changes--;
                    ctx.deleteReply(question).catch(sendError);
                    panel
                        .edit({
                            components: components()
                        })
                        .catch(() => {});
                    return;
                }

                item.itemType = reply.customId as ShopItemType;
                panel
                    .edit({
                        components: components(),
                        embeds: [embed()]
                    })
                    .catch(() => {});
                ctx.deleteReply(question).catch(() => {});
            }
            if (ctx.customId === 'role') {
                await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { questionMark: true })
                                .setTitle('Rôle')
                                .setDescription(
                                    `Quel est le rôle à attribuer à l'objet ?\nRépondez par un **identifiant** ou **une mention** dans le chat\n${hint(
                                        `Vous disposez de **2 minutes**\nTapez \`cancel\` pour annuler`
                                    )}`
                                )
                        ],
                        ephemeral: true
                    })
                    .catch(() => {});
                const msg = (await waitForMessage({
                    channel: panel.channel as TextChannel,
                    user: interaction.user,
                    time: 120000
                }).catch(() => {})) as Message<true>;

                if (msg && msg.deletable) msg.delete().catch(() => {});
                if (!msg || msg.content.toLowerCase() === 'cancel') {
                    changes--;
                    ctx.deleteReply().catch(() => {});
                    return;
                }
                const role = msg.mentions.roles.first() ?? interaction.guild.roles.cache.get(msg.content);

                if (!role) {
                    changes--;
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Rôle introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver le rôle.\nRéessayez avec un identifiant ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                    return;
                }
                if (role.position >= (interaction.member as GuildMember).roles.highest.position) {
                    changes--;
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Röle trop haut')
                                .setDescription(
                                    `Le rôle ${pingRole(role)} est supérier ou égal à vous dans la hiérarchie des rôles`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                    return;
                }
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    changes--;
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Rôle trop haut')
                                .setDescription(
                                    `Le rôle ${pingRole(role)} est supérier ou égal à moi dans la hiérarchie des rôles`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                    return;
                }
                item.roleId = role.id;
                ctx.deleteReply().catch(() => {});
                panel
                    .edit({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(() => {});
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'valider') {
                if (item.itemType !== 'role') item.roleId = '';

                interaction.client.shop.updateItem(interaction.guild.id, {
                    id: item.id,
                    name: item.itemName,
                    quantity: item.quantity,
                    addStock: item.quantityLeft > before.quantityLeft ? item.quantityLeft - before.quantityLeft : 0,
                    removeStock: item.quantityLeft < before.quantityLeft ? before.quantityLeft - item.quantityLeft : 0,
                    roleId: item.roleId,
                    value: item.price
                });

                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Item modifié')
                                .setDescription(`L'item ${item.itemName} a été modifié`)
                        ],
                        components: []
                    })
                    .catch(() => {});
            } else {
                interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(() => {});
            }
        });
    }
    if (cmd === 'supprimer') {
        const id = parseInt(options.getString('item'));
        const item = interaction.client.shop.getShop(interaction.guild.id).find((x) => x.id === id);

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle("Suppression d'item")
                .setDescription(`Êtes-vous sûr de vouloir supprimer l'item \`${item.itemName}\` ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        interaction.client.shop.removeItem(interaction.guild.id, id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Item supprimé')
                        .setDescription(`L'item \`${item.itemName}\` a été supprimé`)
                ],
                components: []
            })
            .catch(() => {});
    }
});
