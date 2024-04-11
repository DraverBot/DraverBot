import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import { jokeNames } from '../../data/jokesName';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { jokes } from '../../typings/database';
import { getDefaultJokeConfigs } from '../../utils/functions';
import query from '../../utils/query';
import { basicEmbed, boolDb, boolEmoji, capitalize, dbBool, subcmd } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.jokes'),
    module: 'administration',
    options: [
        {
            ...translator.commandData('commands.admins.jokes.options.list'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.jokes.options.config'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.jokes.options.config.options.name'),
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: Object.keys(jokeNames)
                        .filter((x) => x !== 'random')
                        .map((k) => ({ ...translator.commandData(`contents.global.jokes.${k}`), value: k }))
                },
                {
                    ...translator.commandData('commands.admins.jokes.options.config.options.state'),
                    required: true,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator']
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'liste') {
        await interaction.deferReply();
        let datas = (await query<jokes>(`SELECT * FROM jokes WHERE guild_id='${interaction.guild.id}'`))[0];
        if (!datas) {
            datas = getDefaultJokeConfigs(interaction.guild.id);
        }

        Object.keys(datas)
            .filter((x) => !x.includes('_'))
            .forEach((k) => {
                datas[k] = dbBool(datas[k]);
            });

        const embed = basicEmbed(interaction.user, { draverColor: true })
            .setTitle(translator.translate('commands.admins.jokes.replies.list.title', interaction))
            .setDescription(translator.translate('commands.admins.jokes.replies.list.description', interaction))
            .setImage(interaction.client.user.displayAvatarURL());

        for (const key of Object.keys(datas).filter((x) => !x.includes('_'))) {
            embed.addFields({
                name: capitalize(jokeNames[key]),
                value: boolEmoji(datas[key]),
                inline: (embed.data.fields ?? []).length % 3 > 0
            });
        }

        interaction
            .editReply({
                embeds: [embed]
            })
            .catch(() => {});
    }
    if (subcommand === 'configurer') {
        const category = options.getString('nom');
        const state = options.getBoolean('état');

        await Promise.all([
            interaction.deferReply(),
            query(
                `REPLACE INTO jokes (guild_id, \`${category}\`) VALUES ('${interaction.guild.id}', '${boolDb(state)}')`
            )
        ]);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.jokes.replies.config.title', interaction))
                        .setDescription(
                            translator.translate(
                                `commands.admins.jokes.replies.config.description${state ? 'Enabled' : 'Disabled'}`,
                                interaction,
                                {
                                    name: jokeNames[category]
                                }
                            )
                        )
                ]
            })
            .catch(() => {});
    }
});
