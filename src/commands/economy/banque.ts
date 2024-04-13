import { coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import replies from '../../data/replies';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { util } from '../../utils/functions';
import { basicEmbed, numerize, plurial, subcmd } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.economy.bank'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.economy.bank.options.display'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.economy.bank.options.deposit'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.economy.bank.options.deposit.options.amount'),
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.economy.bank.options.withdraw'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.economy.bank.options.withdraw.options.amount'),
                    required: true,
                    type: ApplicationCommandOptionType.Integer
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const sub = subcmd(options);
    const manager = coinsManager;

    const data = manager.getData({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id
    });

    if (sub === 'voir') {
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.economy.bank.replies.display.title', interaction))
                        .setDescription(
                            translator.translate('commands.economy.bank.replies.display.description', interaction, {
                                bank: data.bank,
                                ratio: Math.floor((data.bank * 100) / (data.bank + data.coins))
                            })
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
                    embeds: [replies.notEnoughCoins(interaction.member as GuildMember, interaction.user, interaction)]
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
                        .setTitle(translator.translate('commands.economy.bank.replies.deposit.title', interaction))
                        .setDescription(
                            translator.translate('commands.economy.bank.replies.deposit.title', interaction, {
                                count: amount
                            })
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
                    embeds: [replies.notEnoughCoins(interaction.member as GuildMember, interaction.user, interaction)]
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
                        .setTitle(translator.translate('commands.economy.bank.replies.withdraw.title', interaction))
                        .setDescription(
                            translator.translate('commands.economy.bank.replies.withdraw.description', interaction, {
                                count: amount
                            })
                        )
                ]
            })
            .catch(() => {});
    }
});
