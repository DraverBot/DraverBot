import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed, evokerColor, hint, numerize, pingRole, subcmd } from '../utils/toolbox';
import { ShopItemType } from '../typings/database';
import validRole from '../preconditions/validRole';
import { ShopManagerErrorReturns } from '../typings/managers';
import { util } from '../utils/functions';

export default new AmethystCommand({
    name: 'adminmagasin',
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
});
