import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import moduleEnabled from "../preconditions/moduleEnabled";
import { basicEmbed, evokerColor, hint } from "../utils/toolbox";

export default new AmethystCommand({
    name: "suggestion",
    description: "Fait une suggestion sur le serveur",
    options: [{
        name: "suggestion",
        description: "Votre suggestion",
        required: false,
        type: ApplicationCommandOptionType.String
    }],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async({ interaction, options }) => {
    const channel = interaction.guild.channels.cache.get(interaction.client.configsManager.getValue(interaction.guild.id, 'suggest_channel'));
    if (!interaction.client.configsManager.getValue(interaction.guild.id, 'suggest_enable') || !channel) return interaction.reply({
        embeds: [ basicEmbed(interaction.user)
            .setTitle("Suggestions désactivées")
            .setDescription(`Le système de suggestions est désactivé.\n${(interaction.member as GuildMember).permissions.has('Administrator') ? `Le salon des suggestions doit également être configuré` : `Contactez un administrateur du serveur pour configurer le système de suggestions`}\n${hint(`Utilisez la commande \`/config\` pour configurer le système de suggestions`)}`)
            .setColor(evokerColor(interaction.guild))
        ],
        ephemeral: true
    })
})