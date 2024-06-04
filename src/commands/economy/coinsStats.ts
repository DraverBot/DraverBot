import { coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { util } from '../../utils/functions';
import { basicEmbed, evokerColor, numerize, random } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.economy.coins'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    const { coins, bank } = coinsManager.getData({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id
    });

    if (!coins && !bank)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(translator.translate('comamnds.economy.coins.replies.noMoney.title', interaction))
                        .setDescription(
                            translator.translate('commands.economy.coins.replies.noMoney.description', interaction)
                        )
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.economy.coins.replies.embed.title', interaction))
                    .setDescription(translator.translate('commands.economy.coins.replies.embed.description', interaction, { server: interaction.guild.name }))
                    .setFields(
                        {
                            name: translator.translate('commands.economy.coins.replies.embed.fields.money.name', interaction),
                            value: translator.translate('commands.economy.coins.replies.embed.fields.money.value', interaction, { money: coins }),
                            inline: true
                        },
                        {
                            name: translator.translate("commands.economy.coins.replies.embed.fields.bank.name", interaction),
                            value: translator.translate("commands.economy.coins.replies.embed.fields.bank.value", interaction, { bank }),
                            inline: true
                        },
                        {
                            name: translator.translate('commands.economy.coins.replies.embed.fields.total.name', interaction),
                            value: translator.translate('commands.economy.coins.replies.embed.fields.total.value', interaction, { total: coins + bank }),
                            inline: false
                        }
                    )
            ]
        })
        .catch(() => {});
});
