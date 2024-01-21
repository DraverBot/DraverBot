import { ApplicationCommandOptionType, GuildEmoji, GuildMember } from 'discord.js';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import replies from '../../data/replies';
import { compareTwoStrings, findBestMatch } from 'string-similarity';
import { basicEmbed, boolEmoji, displayDate } from '../../utils/toolbox';

export default new DraverCommand({
    name: 'info',
    description: 'Affiche des informations',
    module: 'information',
    options: [
        {
            name: 'émoji',
            description: "Affiche les informations d'un émoji",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'émoji',
                    description: 'Émoji que vous voulez voir',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'émoji') {
        const emojiName = options.getString('émoji');
        await Promise.all([
            interaction
                .reply({
                    embeds: [replies.wait(interaction.user)]
                })
                .catch(log4js.trace),
            interaction.guild.emojis.fetch().catch(log4js.trace)
        ]);

        const emoji = (() => {
            const first = interaction.guild.emojis.cache.get(emojiName);
            if (!!first) return first;

            const matches = findBestMatch(
                emojiName,
                interaction.guild.emojis.cache.map((x) => x.name)
            );
            const best = matches.bestMatch;
            if (best.rating >= 0.7) return interaction.guild.emojis.cache.find((x) => x.name === best.target);

            return interaction.guild.emojis.cache.find(
                (x) => x.name === emojiName || compareTwoStrings(x.name, emojiName) >= 0.85
            );
        })() as GuildEmoji;

        if (!emoji)
            return interaction
                .editReply({
                    embeds: [replies.noEmoji(interaction.member as GuildMember, emojiName)]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Émoji')
                        .setFields(
                            {
                                name: 'Nom',
                                value: emoji.name,
                                inline: true
                            },
                            {
                                name: 'Création',
                                value: displayDate(emoji.createdTimestamp),
                                inline: true
                            },
                            {
                                name: 'Animé',
                                value: boolEmoji(emoji.animated),
                                inline: true
                            },
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: false
                            },
                            {
                                name: 'Identifiant',
                                value: `\`${emoji.id}\``,
                                inline: true
                            },
                            {
                                name: `Mention`,
                                value: `\`<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>\``,
                                inline: true
                            }
                        )
                        .setImage(emoji.url)
                ]
            })
            .catch(log4js.trace);
    }
});
