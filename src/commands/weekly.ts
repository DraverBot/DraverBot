import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, preconditions } from 'amethystjs';
import { util } from '../utils/functions';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, evokerColor, numerize, random, secondsToWeeks } from '../utils/toolbox';

export default new DraverCommand({
    name: "hebdomadaire",
    module: "economy",
    description: 'Récupère votre récompense de ' + util('coins') + ' hebdomadaire',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    if (
        interaction.client.cooldownsManager.has({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id,
            commandName: 'hebdomadaire'
        })
    )
        return interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle('Cooldown')
                    .setDescription(
                        `Vous avez déjà utilisé cette commande pendant les 7 derniers jours.\nMerci de patienter encore **${secondsToWeeks(
                            Math.floor(
                                interaction.client.cooldownsManager.getRemainingTime({
                                    guild_id: interaction.guild.id,
                                    user_id: interaction.user.id,
                                    commandName: 'hebdomadaire'
                                }) / 1000
                            )
                        )}**`
                    )
                    .setColor(evokerColor(interaction.guild))
            ],
            ephemeral: true
        });
    const coins = random({ max: 11391, min: 7000 });

    interaction.client.coinsManager.addCoins({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        coins
    });
    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Récompense hebdomadaire')
                    .setDescription(`Vous avez récupéré **${numerize(coins)} ${util('coins')}** cette semaine`)
            ]
        })
        .catch(() => {});
    interaction.client.cooldownsManager.set({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        time: 604800000,
        cmd: 'hebdomadaire'
    });
});
