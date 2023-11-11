import { DraverCommand } from '../structures/DraverCommand';
import { log4js } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message } from 'discord.js';
import replies from '../data/replies';
import weather from 'weather-js';
import { basicEmbed, buildButton, row, sendError } from '../utils/toolbox';
import { weatherJS } from '../typings/apis';
import moduleEnabled from '../preconditions/moduleEnabled';

export default new DraverCommand({
    name: 'météo',
    module: 'utils',
    description: "Affiche la météo d'une ville",
    options: [
        {
            name: 'ville',
            description: 'Ville dont vous voulez voir la météo',
            required: true,
            type: ApplicationCommandOptionType.String,
            maxLength: 250
        },
        {
            name: 'degré',
            description: 'Affichage des degrés',
            required: false,
            type: ApplicationCommandOptionType.String,
            choices: [
                {
                    name: 'Celsius',
                    value: 'C'
                },
                {
                    name: 'Fahrenheit',
                    value: 'F'
                }
            ]
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const city = options.getString('ville');
    const degrees = options.getString('degré') ?? 'C';

    const msg = (await interaction
        .reply({
            embeds: [replies.wait(interaction.user)],
            fetchReply: true
        })
        .catch(log4js.trace)) as Message<true>;

    if (!msg) return;
    weather.find({ search: city, degreeType: degrees, lang: 'fr', timeout: 20000 }, async (err, res: weatherJS) => {
        if (err) {
            log4js.trace(err);
            sendError(`Erreur sur la commande météo\n${JSON.stringify(err, null, 4)}`);
            return interaction
                .editReply({
                    embeds: [replies.internalError((interaction.member as GuildMember) ?? interaction.user)]
                })
                .catch(log4js.trace);
        }

        if (res.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de résultat')
                            .setDescription(`Aucun résultat n'a pu être trouvé pour \`${city}\``)
                    ]
                })
                .catch(log4js.trace);

        const value = res[0];

        const base = (datas: (typeof value)['current'] | (typeof value)['forecast'][0]) =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle(`Météo - ${value.location.name}`)
                .setDescription(`Prévisions pour le ${datas.day} ${datas.date.split('-')[2]}`);

        const embeds = [
            base(value.current)
                .setDescription(
                    `${base(value.current).data.description}\n\n**Temps :** ${
                        value.current.skytext
                    }\n**Température :** ${value.current.temperature} °${degrees}\n**Ressenti :** ${
                        value.current.feelslike
                    } °${degrees}\n**Vent :** ${value.current.winddisplay}\n**Taux d'humidité :** ${
                        value.current.humidity
                    }%`
                )
                .setThumbnail(value.current.imageUrl),
            ...value.forecast
                .slice(0, 3)
                .map((x) =>
                    base(x as (typeof value)['forecast'][0]).setDescription(
                        `${base(x as any).data.description}\n\n**Temps :** ${x.skytextday}\n**Maximum :** ${
                            x.high
                        } °${degrees}\n**Minimum :** ${x.low} °${degrees}\n**Précipitations :** ${x.precip}%`
                    )
                )
        ];
        let current = 0;

        const components = () => {
            const components = [value.current, ...value.forecast.slice(0, 3)].map((x, i) =>
                buildButton({
                    label: x.date.split('-').reverse().join('/'),
                    style: i === current ? 'Primary' : 'Secondary',
                    id: i.toString()
                })
            );
            return row(...components);
        };
        const edit = () => {
            interaction
                .editReply({
                    embeds: [embeds[current]],
                    components: [components()]
                })
                .catch(log4js.trace);
        };

        edit();
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000
        });

        collector.on('collect', (ctx) => {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    embeds: [replies.replyNotAllowed(ctx.member ?? ctx.user)],
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }

            current = parseInt(ctx.customId);
            ctx.deferUpdate();
            edit();
        });
        collector.on('end', () => {
            interaction
                .editReply({
                    components: [row(...components().components.map((x) => x.setDisabled(true)))]
                })
                .catch(log4js.trace);
        });
    });
});
