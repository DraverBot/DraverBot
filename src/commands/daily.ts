import { coinsManager, cooldownsManager } from '../cache/managers';
import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { util } from '../utils/functions';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, evokerColor, numerize, random, secondsToWeeks } from '../utils/toolbox';

export default new DraverCommand({
    name: 'quotidien',
    module: 'economy',
    description: 'Récupère votre récompense de ' + util('coins') + ' quotidienne',
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
                    .setTitle('Cooldown')
                    .setDescription(
                        `Vous avez déjà utilisé cette commande pendant les 24 dernières heures.\nMerci de patienter encore **${secondsToWeeks(
                            Math.floor(
                                cooldownsManager.getRemainingTime({
                                    guild_id: interaction.guild.id,
                                    user_id: interaction.user.id,
                                    commandName: 'quotidien'
                                }) / 1000
                            )
                        )}**`
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
                    .setTitle('Récompense quotidienne')
                    .setDescription(`Vous avez récupéré **${numerize(coins)} ${util('coins')}** aujourd'hui`)
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
