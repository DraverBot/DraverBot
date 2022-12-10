import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType, ChannelType, TextChannel } from "discord.js";
import moduleEnabled from "../preconditions/moduleEnabled";

export default new AmethystCommand({
    name: 'interserver',
    description: "Gère le système d'interserveur sur le serveur",
    options: [
        {
            name: 'créer',
            description: "Créer un salon d'interserveur sur le serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: "Salon à configurer",
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    name: 'fréquence',
                    description: "Fréquence de l'interserveur",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ],
    preconditions: [ preconditions.GuildOnly, moduleEnabled ],
    permissions: ['Administrator']
}).setChatInputRun(async({ interaction, options }) => {
    const frequence = options.getString('fréquence');

    interaction.deferReply();
    const res = await interaction.client.interserver.createInterserver({
        channel: options.getChannel('salon') as TextChannel,
        frequence,
        guild_id: interaction.guild.id
    });

    console.log(res)

    interaction.editReply(`ok`)
})