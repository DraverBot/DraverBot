import { shop } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    basicEmbed,
    confirm,
    evokerColor,
    numerize,
    paginatorize,
    pingRole,
    plurial,
    subcmd
} from '../../utils/toolbox';
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import { InventoryItem } from '../../typings/database';
import { util } from '../../utils/functions';
import { confirmReturn } from '../../typings/functions';
import replies from '../../data/replies';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.economy.inventory'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.economy.inventory.options.see'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.economy.inventory.options.use'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.economy.inventory.options.use.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'voir') {
        const inventory = shop.getInventory({
            user_id: interaction.user.id,
            guild_id: interaction.guild.id
        });

        if (inventory.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.economy.inventory.replies.see.empty.title', interaction))
                            .setDescription(translator.translate('commands.economy.inventory.replies.see.empty.description', interaction))
                    ]
                })
                .catch(() => {});

        const basic = () => {
            const itemCount = inventory.map((x) => x.quantity).reduce((a, b) => a + b);

            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.economy.inventory.replies.see.base.title', interaction))
                .setDescription(
                    translator.translate('commands.economy.inventory.replies.see.base.description', interaction, {
                        items: itemCount,
                        server: interaction.guild.name
                    })
                );
        };
        const map = (embed: EmbedBuilder, item: InventoryItem) => {
            return embed.addFields({
                name: translator.translate('commands.economy.inventory.replies.see.mapper.name', interaction, {
                    name: item.name,
                    quantity: item.quantity
                }),
                value: item.type === 'role' ? translator.translate('commands.economy.inventory.replies.see.mapper.role', interaction, {
                    role: pingRole(item.roleId)
                }) : '' + translator.translate('commands.economy.inventory.replies.see.mapper.value', interaction, {
                    amount: item.quantity * item.value,
                }) + (item.quantity > 1 ? translator.translate('commands.economy.inventory.replies.see.mapper.each', interaction, {
                    each: item.value
                }) : '')
            });
        };

        if (inventory.length <= 5) {
            const embed = basic();

            inventory.forEach((v) => {
                map(embed, v);
            });

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            paginatorize({
                array: inventory,
                embedFunction: basic,
                mapper: map,
                interaction,
                user: interaction.user
            });
        }
    }
    if (cmd === 'utiliser') {
        const inventory = shop.getInventory({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        });
        const item = inventory.find((x) => x.id === parseInt(options.getString('rôle')));

        if ((interaction.member as GuildMember).roles.cache.has(item.roleId))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(translator.translate('commands.economy.inventory.replies.use.got.title', interaction))
                            .setDescription(translator.translate('commands.economy.inventory.replies.use.got.description', interaction, {
                                role: pingRole(item.roleId)
                            }))
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.economy.inventory.replies.use.confirm.title', interaction))
                .setDescription(
                    translator.translate(`commands.economy.inventory.replies.use.confirm.description${item.quantity === 1 ? 'None' : ''}`, interaction, {
                        name: item.name,
                        role: pingRole(item.roleId),
                        quantity: item.quantity - 1
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

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user, confirmation.interaction)],
                components: []
            })
            .catch(() => {});

        await (interaction.member as GuildMember).roles.add(item.roleId).catch(() => {});
        shop.removeFromInventory({
            user_id: interaction.user.id,
            guild_id: interaction.guild.id,
            itemId: item.id
        });

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.economy.inventory.replies.use.used.title', interaction))
                        .setDescription(translator.translate('commands.economy.inventory.replies.use.used.description', interaction, {
                            role: pingRole(item.roleId),
                            name: item.name
                        })
                    )
                ]
            })
            .catch(() => {});
    }
});
