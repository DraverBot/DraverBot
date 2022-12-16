import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType } from "discord.js";
import moduleEnabled from "../preconditions/moduleEnabled";
import { levels } from "../typings/managers";
import { util } from "../utils/functions";
import { basicEmbed, numerize, plurial } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'rank',
    description: "Affiche les informations de niveaux",
    options: [
        {
            name: 'membre',
            description: "Membre que vous voulez voir",
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    preconditions: [ preconditions.GuildOnly, moduleEnabled ]
}).setChatInputRun(async({ interaction, options }) => {
    const user = options.getUser('membre') ?? interaction.user;

    const data: levels<number> = interaction.client.levelsManager.userData({
        guild_id: interaction.guild.id,
        user_id: user.id
    }) ?? { guild_id: interaction.guild.id, user_id: user.id, level: 0, messages: 0, required: 255 };

    const embed = basicEmbed(interaction.user)
        .setTitle("Niveaux")
        .setThumbnail(user.displayAvatarURL())
        .setFields(
            {
                name: "Messages",
                value: numerize(data.messages) + ' mesage' + plurial(data.messages, {}),
                inline: true
            },
            {
                name: 'Niveau',
                value: numerize(data.level),
                inline: true
            },
            {
                name: "Place dans le classement",
                value: (interaction.client.levelsManager.leaderboard(interaction.guild.id).toJSON().indexOf(data) ?? interaction.client.levelsManager.leaderboard().size - 1) + 1 + `°`,
                inline: false
            }
        )
        .setColor(interaction.guild.members.me.displayHexColor ?? util('accentColor'));
    interaction.reply({
        embeds: [embed]
    }).catch(() => {});
})