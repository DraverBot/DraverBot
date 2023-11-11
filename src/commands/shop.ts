import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import { basicEmbed, evokerColor, hint, numerize, pagination, pingRole, plurial, subcmd } from '../utils/toolbox';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ShopItem } from '../typings/database';
import { util } from '../utils/functions';
import replies from '../data/replies';
import { ShopManagerErrorReturns } from '../typings/managers';

export default new DraverCommand({
    name: 'magasin',
    module: 'economy',
    description: 'Interagit avec le magasin',
    options: [
        {
            name: 'afficher',
            description: 'Affiche le magasin',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'acheter',
            description: 'Achète un objet du magasin',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'item',
                    description: 'Item à acheter',
                    required: true,
                    autocomplete: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'afficher') {
        const shop = interaction.client.shop.getShop(interaction.guild.id);

        if (shop.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Magasin vide')
                            .setDescription(
                                `Le magasin de **${interaction.guild.name}** est vide\n${hint(
                                    `Vous pouvez ajouter des objets avec la commande \`/adminmagasin créer\``
                                )}`
                            )
                    ]
                })
                .catch(() => {});

        const basic = () => {
            const embed = basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Magasin')
                .setDescription(`Voici le magasin de ${interaction.guild.name}`);

            if (interaction.guild.icon)
                embed.setThumbnail(interaction.guild.iconURL({ forceStatic: true, extension: 'jpg' }));
            return embed;
        };
        const map = (embed: EmbedBuilder, item: ShopItem) => {
            return embed.addFields({
                name: `${item.itemName} (${
                    item.itemType === 'item' ? 'objet' : item.itemType === 'role' ? 'rôle' : 'inconnu'
                })`,
                value: `${numerize(item.price)} ${util('coins')}${
                    item.quantity > 0
                        ? ` ( ${numerize(item.quantityLeft)} restant(e)${plurial(item.quantityLeft)} )`
                        : ''
                }${item.itemType === 'role' ? `\nRôle : ${pingRole(item.roleId)}` : ''}`
            });
        };

        if (shop.length <= 5) {
            const embed = basic();

            shop.forEach((x) => {
                map(embed, x);
            });

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds = [basic()];

            shop.forEach((v, i) => {
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
    if (cmd === 'acheter') {
        const shop = interaction.client.shop.getShop(interaction.guild.id);
        const itemId = parseInt(options.getString('item'));

        const item = shop.find((x) => x.id === itemId);
        if (
            item.price >
            interaction.client.coinsManager.getData({ user_id: interaction.user.id, guild_id: interaction.guild.id })
                .coins
        )
            return interaction
                .reply({
                    embeds: [replies.notEnoughCoins(interaction.member as GuildMember)],
                    ephemeral: true
                })
                .catch(() => {});

        const result = interaction.client.shop.buyItem({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            itemId
        });

        if (result === ShopManagerErrorReturns.EmptyStock)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Objet indisponible')
                            .setDescription(`Cet objet n'est plus en stock sur **${interaction.guild.name}**`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Achat effectué')
                        .setDescription(
                            `Vous avez acheté 1 **${item.itemName}** pour **${numerize(item.price)} ${util('coins')}**${
                                item.itemType === 'role'
                                    ? `\n${hint(
                                          `Vous pouvez récupérer le rôle en utilisant la commande \`/inventaire utiliser\``
                                      )}`
                                    : ''
                            }`
                        )
                ]
            })
            .catch(() => {});
    }
});
