import { blagues } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { ApplicationCommandOptionType } from 'discord.js';
import { jokeNames } from '../../data/jokesName';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { jokes } from '../../typings/database';
import { getDefaultJokeConfigs, util } from '../../utils/functions';
import query from '../../utils/query';
import { basicEmbed, capitalize, dbBool, evokerColor, notNull } from '../../utils/toolbox';
import { Category } from 'blagues-api/dist/types/types';

export default new DraverCommand({
    name: 'blague',
    module: 'fun',
    description: 'Affiche une blague',
    options: [
        {
            name: 'catégorie',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: 'Catégorie de la blague que vous voulez',
            choices: Object.keys(jokeNames).map((x) => ({ name: capitalize(jokeNames[x]), value: x }))
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const category = options.getString('catégorie') as keyof typeof jokeNames;

    await interaction.deferReply();
    let configs = (await query<jokes>(`SELECT * FROM jokes WHERE guild_id='${interaction.guild.id}'`))[0];
    if (!configs) configs = getDefaultJokeConfigs(interaction.guild.id);

    const isRandom = category === 'random' || !notNull(category);

    if (!isRandom && !dbBool(configs[category]))
        return interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setColor(evokerColor(interaction.guild))
                        .setDescription(
                            `La catégorie ${jokeNames[category]} n'est pas activée sur ${interaction.guild.name}`
                        )
                        .setTitle('Catégorie interdite')
                ]
            })
            .catch(() => {});

    const joke = isRandom
        ? await blagues.random({
              disallow: Object.keys(configs)
                  .filter((x) => !x.includes('_'))
                  .filter((k) => !dbBool(configs[k])) as Category[]
          })
        : await blagues.randomCategorized(category);

    if (!joke || (joke as unknown as { status: number }).status === 404)
        return interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(`Erreur`)
                        .setDescription(
                            `Aucune blague n'a été trouvée.\nVous ne devriez pas voir ce message.\nRéessayez dans quelques minutes.\nSi ce message d'erreur persiste, contactez mes développeurs via [le support](${util(
                                'support'
                            )}) ou par mail \`${util('email')}\``
                        )
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    interaction
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(joke.joke)
                    .setDescription('||' + joke.answer + '||')
                    .setFooter({
                        text: `Blague ${jokeNames[joke.type]}`,
                        iconURL:
                            interaction.guild.iconURL({ forceStatic: false }) ??
                            interaction.client.user.displayAvatarURL()
                    })
            ]
        })
        .catch(() => {});
});
