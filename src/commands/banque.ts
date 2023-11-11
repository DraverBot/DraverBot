import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import replies from '../data/replies';
import moduleEnabled from '../preconditions/moduleEnabled';
import { util } from '../utils/functions';
import { basicEmbed, numerize, plurial, subcmd } from '../utils/toolbox';

export default new DraverCommand({
    name: 'banque',
    module: 'economy',
    description: 'Gère votre banque',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'voir',
            description: 'Consulte votre banque',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'déposer',
            description: "Dépose de l'argent sur votre compte en banque",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'montant',
                    description: 'Montant que vous voulez déposer',
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            name: 'retirer',
            description: "Retire de l'argent de votre compte en banque",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'montant',
                    description: 'Montant à retirer de votre compte en banque',
                    required: true,
                    type: ApplicationCommandOptionType.Integer
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const sub = subcmd(options);
    const manager = interaction.client.coinsManager;

    const data = manager.getData({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id
    });

    if (sub === 'voir') {
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Votre compte en banque')
                        .setDescription(
                            `Vous possédez **${numerize(data.bank)} ${util(
                                'coins'
                            )}** sur votre compte, soit **${Math.floor(
                                (data.bank * 100) / (data.bank + data.coins)
                            )}%** de votre argent total`
                        )
                ]
            })
            .catch(() => {});
    }
    if (sub === 'déposer') {
        const amount = options.getInteger('montant');
        if (data.coins < amount)
            return interaction
                .reply({
                    embeds: [replies.notEnoughCoins(interaction.member as GuildMember)]
                })
                .catch(() => {});

        manager.removeCoins({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            coins: amount
        });
        manager.addBank({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            bank: amount
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Transaction effectuée')
                        .setDescription(
                            `${numerize(amount)} ${util('coins')} ${plurial(amount, {
                                singular: 'a été déposé',
                                plurial: 'ont été déposés'
                            })} sur votre compte en banque`
                        )
                ]
            })
            .catch(() => {});
    }
    if (sub === 'retirer') {
        const amount = options.getInteger('montant');
        if (data.bank < amount)
            return interaction
                .reply({
                    embeds: [replies.notEnoughCoins(interaction.member as GuildMember)]
                })
                .catch(() => {});

        const res = manager.removeBank({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            bank: amount
        });
        console.log(res);
        manager.addCoins({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            coins: amount
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Transaction effectuée')
                        .setDescription(
                            `${numerize(amount)} ${util('coins')} ${plurial(amount, {
                                singular: 'a été retiré',
                                plurial: 'ont été retirés'
                            })} de votre compte en banque`
                        )
                ]
            })
            .catch(() => {});
    }
});
