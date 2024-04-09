import { levelsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { levels } from '../../typings/managers';
import { util } from '../../utils/functions';
import { basicEmbed, numerize, plurial } from '../../utils/toolbox';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'rank',
    module: 'level',
    description: 'Affiche les informations de niveaux',
    options: [
        {
            name: 'membre',
            description: 'Membre que vous voulez voir',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
})
    .setChatInputRun(async ({ interaction, options }) => {
        const user = options.getUser('membre') ?? interaction.user;

        const data: levels<number> = levelsManager.userData({
            guild_id: interaction.guild.id,
            user_id: user.id
        }) ?? { guild_id: interaction.guild.id, user_id: user.id, level: 0, messages: 0, required: 255 };

        const embed = basicEmbed(interaction.user)
            .setTitle('Niveaux')
            .setThumbnail(user.displayAvatarURL())
            .setFields(
                {
                    name: 'Messages',
                    value: numerize(data.messages) + ' mesage' + plurial(data.messages, {}),
                    inline: true
                },
                {
                    name: 'Niveau',
                    value: numerize(data.level),
                    inline: true
                },
                {
                    name: 'Messages totaux',
                    value: numerize(
                        (() => {
                            let total = data.messages;

                            for (let i = 0; i < data.level - 1; i++) {
                                total += levelsManager.computeRequiredMessages(i + 1);
                            }
                            return total;
                        })()
                    ),
                    inline: true
                },
                {
                    name: 'Place dans le classement',
                    value:
                        (levelsManager.leaderboard(interaction.guild.id).toJSON().indexOf(data) ??
                            levelsManager.leaderboard().size - 1) +
                        1 +
                        `°`,
                    inline: false
                }
            )
            .setColor(interaction.guild.members.me.displayHexColor ?? util('accentColor'));
        interaction
            .reply({
                embeds: [embed]
            })
            .catch(() => {});
    })
    .setUserContextRun(async ({ interaction, user }) => {
        if (user.bot)
            return interaction
                .reply({
                    embeds: [
                        replies.memberBot(interaction.user, {
                            member: interaction.targetMember as GuildMember,
                            lang: interaction
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const stats = levelsManager.userData({ user_id: user.id, guild_id: interaction.guild.id });
        const embed = basicEmbed(interaction.user)
            .setTitle('Niveaux')
            .setThumbnail(user.displayAvatarURL())
            .setFields(
                {
                    name: 'Messages',
                    value: numerize(stats.messages) + ' mesage' + plurial(stats.messages, {}),
                    inline: true
                },
                {
                    name: 'Niveau',
                    value: numerize(stats.level),
                    inline: true
                },
                {
                    name: 'Place dans le classement',
                    value:
                        (levelsManager.leaderboard(interaction.guild.id).toJSON().indexOf(stats) ??
                            levelsManager.leaderboard().size - 1) +
                        1 +
                        `°`,
                    inline: false
                }
            )
            .setColor(interaction.guild.members.me.displayHexColor ?? util('accentColor'));
        interaction
            .reply({
                embeds: [embed],
                ephemeral: true
            })
            .catch(() => {});
    });
