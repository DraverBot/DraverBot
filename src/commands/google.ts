import { AmethystCommand } from 'amethystjs';
import { ApplicationCommandOptionType, TextChannel } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, evokerColor, hint } from '../utils/toolbox';
import NSFWwords from '../data/NSFWwords.json';
import { util } from '../utils/functions';

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
    const search = options.getString('recherche');
    if (NSFWwords.some((x) => search.toLowerCase().includes(x)) && !(interaction.channel as TextChannel).nsfw) {
        return interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle('Contenu NSFW')
                    .setDescription(
                        `Il semblerait que votre recherche contiennent du contenu NSFW.\nVeillez à utiliser cette commande dans un salon NSFW.\n${hint(
                            `Si vous pensez que ce message est une erreur, faites-nous part de cette expérience sur [le serveur de support](${util(
                                'support'
                            )})`
                        )}`
                    )
                    .setColor(evokerColor(interaction.guild))
            ]
        });
    }

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
