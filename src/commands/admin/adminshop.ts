import { shop } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction, waitForMessage } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
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
} from '../../utils/toolbox';
import { ShopItemType } from '../../typings/database';
import validRole from '../../preconditions/validRole';
import { ShopManagerErrorReturns } from '../../typings/managers';
import { util } from '../../utils/functions';
import { cancelButton } from '../../data/buttons';
import replies from '../../data/replies';
import { confirmReturn } from '../../typings/functions';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.shop'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled, validRole],
    permissions: ['ManageGuild'],
    options: [
        {
            ...translator.commandData('commands.admins.shop.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.shop.options.create.options.name'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.shop.options.create.options.price'),
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0
                },
                {
                    ...translator.commandData('commands.admins.shop.options.create.options.type'),
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            ...translator.commandData('commands.admins.shop.options.create.options.type.choices.role'),
                            value: 'role'
                        },
                        {
                            ...translator.commandData('commands.admins.shop.options.create.options.type.choices.item'),
                            value: 'item'
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.shop.options.create.options.quantity'),
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    ...translator.commandData('commands.admins.shop.options.create.options.role'),
                    type: ApplicationCommandOptionType.Role,
                    required: false
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.shop.options.edit'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.shop.options.edit.options.item'),
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.shop.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.shop.options.delete.options.item'),
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

        const result = await shop.addItem(interaction.guild.id, {
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
                            .setTitle(translator.translate('commands.admins.shop.replies.create.exists.title', interaction))
                            .setDescription(translator.translate('commands.admins.shop.replies.crate.exists.description', interaction))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.shop.replies.create.created.title', interaction))
                        .setDescription(
                            translator.translate(`commands.admins.shop.replies.create.created.description_${type}`, interaction, {
                                name,
                                price,
                                role: pingRole(role?.id),
                                stock: translator.translate(`commands.admins.shop.replies.create.created.quantity${quantity === 0 ? '_infinite' : ''}`, interaction, {
                                    stock: quantity
                                })
                            })
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'modifier') {
        const itemId = parseInt(options.getString('item'));
        const item = shop.getShop(interaction.guild.id).find((x) => x.id === itemId);

        const before = item;
        let changes = 0;

        const embed = () => {
            return basicEmbed(interaction.user, { questionMark: true })
                .setTitle(translator.translate('commands.admins.shop.replies.edit.embed.title', interaction))
                .setDescription(translator.translate('commands.admins.shop.replies.edit.embed.description', interaction))
                .setFields(
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.name.name', interaction),
                        value: item.itemName,
                        inline: true
                    },
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.price.name', interaction),
                        value: translator.translate('commands.admins.shop.replies.edit.embed.fields.price.value', interaction, {
                            price: item.price
                        }),
                        inline: true
                    },
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.type.name', interaction),
                        value: translator.translate(`commands.admins.shop.replies.edit.embed.fields.type.${item.itemType === 'item' ? 'item' : item.itemType === 'role' ? 'role' : 'unknown'}`, interaction),
                        inline: false
                    },
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.quantity.name', interaction),
                        value: translator.translate(`commands.admins.shop.replies.edit.embed.fields.quantity.${item.quantity === 0 ? 'infinite' : 'value'}`, interaction, { quantity: item.quantity }),
                        inline: true
                    },
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.available.name', interaction),
                        value: translator.translate(`commands.admins.shop.replies.edit.embed.fields.available.${item.quantity === 0 ? 'infinite' : 'value'}`, interaction, { quantity: item.quantityLeft }),
                        inline: true
                    },
                    {
                        name: translator.translate('commands.admins.shop.replies.edit.embed.fields.role.name', interaction),
                        value:
                            item.roleId.length > 1 && item.itemType === 'role' ? pingRole(item.roleId) : translator.translate('commands.admins.shop.replies.edit.embed.fields.role.none', interaction)
                    }
                );
        };
        const components = (fullDisable = false) => {
            return [
                row(
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.name', interaction),
                        style: 'Primary',
                        id: 'name',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.price', interaction),
                        style: 'Primary',
                        id: 'price',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.type', interaction),
                        style: 'Secondary',
                        id: 'type',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.quantity', interaction),
                        style: 'Success',
                        id: 'quantity',
                        disabled: fullDisable
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.left', interaction),
                        style: 'Danger',
                        id: 'quantityLeft',
                        disabled: fullDisable
                    })
                ),
                row(
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.role', interaction),
                        style: 'Primary',
                        id: 'role',
                        disabled: item.itemType !== 'role' || fullDisable
                    }),
                    buildButton({
                        label: translator.translate('commands.admins.shop.buttons.validate', interaction),
                        style: 'Success',
                        id: 'valider',
                        disabled: changes === 0 || (item.itemType === 'role' && item.roleId.length < 1) || fullDisable
                    }),
                    cancelButton(interaction).setDisabled(fullDisable)
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
                        .setTitle(translator.translate('commands.admins.shop.replies.edit.error.title', interaction))
                        .setDescription(translator.translate('commands.admins.shop.replies.edit.error.description', interaction))
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
                            .setTitle(translator.translate('commands.admins.shop.modal.name.title', interaction))
                            .setCustomId('edit')
                            .setComponents(
                                row<TextInputBuilder>(
                                    new TextInputBuilder()
                                        .setLabel(translator.translate('commands.admins.shop.modal.name.fields.name.name', interaction))
                                        .setPlaceholder(translator.translate('commands.admins.shop.modal.name.fields.name.placeholder', interaction))
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
                await ctx.showModal(
                    new ModalBuilder()
                        .setTitle(translator.translate('commands.admins.shop.modals.quantity.title', ctx))
                        .setCustomId('edit')
                        .setComponents(
                            row<TextInputBuilder>(
                                new TextInputBuilder()
                                    .setStyle(TextInputStyle.Short)
                                    .setLabel(translator.translate(`commands.admins.shop.modal.labels.${ctx.customId}`, ctx))
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
                            embeds: [replies.invalidNumber(interaction.member as GuildMember, ctx)],
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
                                label: translator.translate('commands.admins.shop.buttons.itemType', ctx),
                                style: 'Primary',
                                id: 'item',
                                disabled: item.itemType === 'item'
                            }),
                            buildButton({
                                label: translator.translate('commands.admins.shop.buttons.roleType', ctx),
                                style: 'Secondary',
                                id: 'role',
                                disabled: item.itemType === 'role'
                            }),
                            cancelButton(ctx)
                        )
                    ];
                };
                const question = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { questionMark: true })
                                .setTitle(translator.translate('commands.admins.shop.replies.edit.type.title', ctx))
                                .setDescription(translator.translate('commands.admins.shop.replies.edit.type.description', ctx))
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
                    replies: waitForReplies(interaction.client, ctx)
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
                                .setTitle(translator.translate('commands.admins.shop.replies.edit.role.title', interaction))
                                .setDescription(
                                    translator.translate('commands.admins.shop.replies.edit.role.description', interaction)
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
                            replies.noRole(interaction.member as GuildMember, ctx)
                        ]
                    }).catch(() => {});
                    return;
                }
                if (role.position >= (interaction.member as GuildMember).roles.highest.position) {
                    changes--;
                    ctx.editReply({
                        embeds: [
                            replies.roleTooHigh(interaction.member as GuildMember, role, ctx)
                        ]
                    }).catch(() => {});
                    return;
                }
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    changes--;
                    ctx.editReply({
                        embeds: [
                            replies.roleTooHighClient(interaction.member as GuildMember, role, ctx)
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

                shop.updateItem(interaction.guild.id, {
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
                                .setTitle(translator.translate('commands.admins.shop.replies.edit.edited.title', interaction))
                                .setDescription(translator.translate('commands.admins.shop.replies.edit.edited.description', interaction, { name: item.itemName }))
                        ],
                        components: []
                    })
                    .catch(() => {});
            } else {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});
            }
        });
    }
    if (cmd === 'supprimer') {
        const id = parseInt(options.getString('item'));
        const item = shop.getShop(interaction.guild.id).find((x) => x.id === id);

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.shop.replies.delete.deleting.title', interaction))
                .setDescription(translator.translate('commands.admins.shop.replies.delete.deleting.description', interaction, { name: item.itemName }))
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        shop.removeItem(interaction.guild.id, id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.shop.replies.delete.deleted.title', interaction))
                        .setDescription(translator.translate('commands.admins.shop.replies.delete.deleted.description', interaction, { name: item.itemName }))
                ],
                components: []
            })
            .catch(() => {});
    }
});
