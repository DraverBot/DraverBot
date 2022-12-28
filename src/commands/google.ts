import { AmethystCommand } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'google',
    description: 'Fait une recherche google',
    options: [
        {
            name: 'recherche',
            description: 'La recherche que vous voulez effectuer',
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle('Recherche google')
                    .setDescription(
                        `Appuyez sur [ce lien](https://google.fr/search?q=${options
                            .getString('recherche')
                            .replace(/ +/g, '+')}) pour voir votre recherche google`
                    )
            ]
        })
        .catch(() => {});
});
