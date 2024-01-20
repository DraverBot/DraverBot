import { shop } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, confirm, evokerColor, numerize, paginatorize, pingRole, plurial, subcmd } from '../../utils/toolbox';
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from 'discord.js';
import { InventoryItem } from '../../typings/database';
import { util } from '../../utils/functions';
import { confirmReturn } from '../../typings/functions';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'inventaire',
    module: 'economy',
    description: 'Gère votre inventaire',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'voir',
            description: 'Affiche votre inventaire',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'utiliser',
            description: 'Utilise un rôle dans votre inventaire',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à utiliser',
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
                            .setTitle('Inventaire vide')
                            .setDescription(`Vous n'avez rien dans votre inventaire`)
                    ]
                })
                .catch(() => {});

        const basic = () => {
            const itemCount = inventory.map((x) => x.quantity).reduce((a, b) => a + b);

            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Inventaire')
                .setDescription(
                    `Vous avez **${numerize(itemCount)} item${plurial(itemCount)}** sur ${interaction.guild.name}`
                );
        };
        const map = (embed: EmbedBuilder, item: InventoryItem) => {
            return embed.addFields({
                name: `${item.name} (x${numerize(item.quantity)})`,
                value: `${item.type === 'role' ? `Rôle ${pingRole(item.roleId)}\n` : ''}Valeur totale : **${numerize(
                    item.quantity * item.value
                )} ${util('coins')}**${item.quantity > 1 ? ` ( ${numerize(item.value)} ${util('coins')} pièce )` : ''}`
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
                            .setTitle('Rôle déjà possédé')
                            .setDescription(`Vous avez déjà le rôle ${pingRole(item.roleId)}`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Utilisation de rôle')
                .setDescription(
                    `Vous allez utiliser **1 ${item.name}** pour obtenir le rôle ${pingRole(item.roleId)}\n${
                        item.quantity === 1
                            ? `Vous n'aurez plus cet item après l'utilisation`
                            : `Il vous restera **${numerize(item.quantity - 1)} ${item.name}** après l'utilisation`
                    }\nVoulez-vous continuer ?`
                )
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
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
                        .setTitle('Item utilisé')
                        .setDescription(`Vous avez utilisé **${item.name}** et obtenu le rôle ${pingRole(item.roleId)}`)
                ]
            })
            .catch(() => {});
    }
});
