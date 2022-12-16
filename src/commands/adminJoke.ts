import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType } from "discord.js";
import { jokeNames } from "../data/jokesName";
import moduleEnabled from "../preconditions/moduleEnabled";
import { defaultJokesTypes, jokes } from "../typings/database";
import query from "../utils/query";
import { arrayfy, basicEmbed, boolDb, boolEmoji, capitalize, dbBool, subcmd } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'adminblague',
    description: "Gère les blagues sur le serveur",
    options: [
        {
            name: 'liste',
            description: "Liste les configurations sur le serveur",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'configurer',
            description: "Configure une catégorie de blagues",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "nom",
                    description: "Nom de la catégorie",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: Object.keys(jokeNames).filter(x => x !== 'random').map(k => ({ name: capitalize(jokeNames[k]), value: k }))
                },
                {
                    name: "état",
                    description: "État de la catégorie",
                    required: true,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        }
    ],
    preconditions: [ preconditions.GuildOnly, moduleEnabled ],
    permissions: ['Administrator']
}).setChatInputRun(async({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'liste') {
        await interaction.deferReply();
        let datas = (await query<jokes>(`SELECT * FROM jokes WHERE guild_id='${interaction.guild.id}'`))[0];
        if (!datas) {
            datas = {} as jokes;
            Object.keys(defaultJokesTypes).forEach((k) => {
                datas[k] = boolDb(defaultJokesTypes[k])
            });
        }

        Object.keys(datas).filter(x => !x.includes('_')).forEach((k) => {
            datas[k] = dbBool(datas[k]);
        });

        const embed = basicEmbed(interaction.user, { defaultColor: true })
            .setTitle("Blagues")
            .setDescription(`Voici la configuration des blagues sur le serveur`)
            .setImage(interaction.client.user.displayAvatarURL())
        for (const key of Object.keys(datas).filter(x => !x.includes('_'))) {
            embed.addFields({
                name: capitalize(jokeNames[key]),
                value: boolEmoji(datas[key]),
                inline: (embed.data.fields ?? []).length % 3 > 0
            })
        }

        interaction.editReply({
            embeds: [ embed ]
        }).catch(() => {});
    }
    if (subcommand === 'configurer') {
        const category = options.getString('nom');
        const state = options.getBoolean('état')

        await Promise.all([ interaction.deferReply(), query(`REPLACE INTO jokes (guild_id, ${category}) VALUES ('${interaction.guild.id}', '${boolDb(state)}')`)]);
        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Catégorie configurée")
                .setDescription(`La catégorie **${jokeNames[category]}** a été **${state ? 'activée' : 'désactivée'}**`)
            ]
        }).catch(() => {});
    }
})