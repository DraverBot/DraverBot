import { AmethystCommand, log4js } from 'amethystjs';
import { ApplicationCommandOptionType, TextChannel } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, hint, resizeString } from '../utils/toolbox';
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
})
    .setChatInputRun(async ({ interaction, options }) => {
        const search = options.getString('recherche');
        if (NSFWwords.some((x) => search.toLowerCase().includes(x)) && !(interaction.channel as TextChannel).nsfw) {
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Contenu NSFW')
                        .setDescription(
                            `Il semblerait que votre recherche contiennent du contenu NSFW.\nVeillez à utiliser cette commande dans un salon NSFW.\n${hint(
                                `Si vous pensez que ce message est une erreur, faites-nous part de cette expérience sur [le serveur de support](${util(
                                    'support'
                                )})`
                            )}`
                        )
                ]
            });
        }

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Recherche google')
                        .setDescription(
                            `Appuyez sur [ce lien](https://google.fr/search?q=${options
                                .getString('recherche')
                                .replace(/ +/g, '+')}) pour voir votre recherche google`
                        )
                ]
            })
            .catch(() => {});
    })
    .setMessageContextRun(async ({ interaction, message }) => {
        const search =
            message?.embeds?.length > 0
                ? message.embeds[0]?.title ?? message?.content
                : message?.content ?? message.author.username;
        if (NSFWwords.some((x) => search.toLowerCase().includes(x)) && !(interaction.channel as TextChannel).nsfw) {
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Contenu NSFW')
                        .setDescription(
                            `Il semblerait que votre recherche contiennent du contenu NSFW.\nVeillez à utiliser cette commande dans un salon NSFW.\n${hint(
                                `Si vous pensez que ce message est une erreur, faites-nous part de cette expérience sur [le serveur de support](${util(
                                    'support'
                                )})`
                            )}`
                        )
                ]
            });
        }
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Recherche google')
                        .setDescription(
                            `Voici le sujet sur lequel le lien va vous renvoyer :\`${resizeString({
                                str: search,
                                length: 50
                            })}\`.\n[Appuyez ici](https://google.fr/search?q=${search.replace(
                                / +/g,
                                '+'
                            )}) pour voir votre recherche`
                        )
                ],
                ephemeral: true
            })
            .catch(log4js.trace);
    });
