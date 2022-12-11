import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { util } from '../utils/functions';
import { basicEmbed, evokerColor, numerize, random } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'portefeuille',
    description: 'Affiche votre portefeuille sur le serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    const { coins, bank } = interaction.client.coinsManager.getData({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id
    });

    if (!coins && !bank)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(':x: Pas de monnaie')
                        .setDescription(
                            random({ max: 100 }) === 95
                                ? `Vous n'avez pas d'argent sur votre compte.\nRécupérez des pièces et ré-effectuez cette commande, parce que pour l'instant vous êtes à la rue`
                                : `Vous n'avez pas d'argent sur votre compte.\nRécupérérez des pièces et ré-effectuez cette commande.`
                        )
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle('Votre portefeuille')
                    .setDescription(`Voici votre portefeuille sur ${interaction.guild.name}`)
                    .setFields(
                        {
                            name: 'Sur vous',
                            value: `${numerize(coins)} ${util('coins')}`,
                            inline: true
                        },
                        {
                            name: 'En banque',
                            value: `${numerize(bank)} ${util('coins')}`,
                            inline: true
                        },
                        {
                            name: 'Total',
                            value: `${numerize(bank + coins)} ${util('coins')}`,
                            inline: true
                        }
                    )
            ]
        })
        .catch(() => {});
});
