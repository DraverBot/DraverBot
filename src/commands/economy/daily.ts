import { coinsManager, cooldownsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { util } from '../../utils/functions';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, evokerColor, numerize, random, secondsToWeeks } from '../../utils/toolbox';
import { translator } from '../../translate/translate';
import time from '../../maps/time';

export default new DraverCommand({
    ...translator.commandData('commands.economy.daily'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    if (
        cooldownsManager.has({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            commandName: 'quotidien'
        })
    )
        return interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle(translator.translate('commands.economy.daily.replies.cooldown.title', interaction))
                    .setDescription(
                        translator.translate('commands.economy.daily.replies.cooldown.description', interaction, {
                            time: secondsToWeeks(
                                Math.floor(
                                    cooldownsManager.getRemainingTime({
                                        guild_id: interaction.guild.id,
                                        user_id: interaction.user.id,
                                        commandName: 'quotidien'
                                    }) / 1000
                                )
                            )
                        })
                    )
                    .setColor(evokerColor(interaction.guild))
            ],
            ephemeral: true
        });
    const coins = random({ max: 8000, min: 1500 });

    coinsManager.addCoins({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        coins
    });
    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.economy.daily.replies.claimed.title', interaction))
                    .setDescription(translator.translate('commands.economy.daily.replies.claimed.description', interaction, { amount: coins }))
            ]
        })
        .catch(() => {});
    cooldownsManager.set({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        time: 86400000,
        cmd: 'quotidien'
    });
});
