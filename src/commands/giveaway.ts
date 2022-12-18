import { AmethystCommand } from "amethystjs";
import moduleEnabled from "../preconditions/moduleEnabled";
import { ApplicationCommandOptionType, ChannelType, TextChannel } from "discord.js";
import timePrecondition from "../preconditions/time";
import { basicEmbed, displayDate, evokerColor, numerize, pingChan, plurial, subcmd } from "../utils/toolbox";
import ms from "ms";
import { Giveaway } from "discordjs-giveaways";

export default new AmethystCommand({
    name: 'giveaway',
    description: "Gère les giveaways sur le serveur",
    permissions: ['ManageChannels', 'ManageGuild'],
    preconditions: [moduleEnabled, timePrecondition],
    options: [
        {
            name: "créer",
            description: "Crée un giveaway",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'récompense',
                    description: "Récompense du giveaway",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'gagnants',
                    description: "Nombre de gagnants du giveaway",
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    name: 'temps',
                    description: "Temps du giveaway",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'salon',
                    description: "Salon du giveaway",
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    name: 'bonus',
                    description: "Identifiants des rôles bonus (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'requis',
                    description: "Identifiants des rôles requis (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'interdits',
                    description: "Identifiants des rôles interdits (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;
        const reward = options.getString('récompense');
        const time = ms(options.getString('temps'));
        const bonuses = (options.getString('bonus') ?? '').split(/ +/g);
        const required = (options.getString('requis') ?? '').split(/ +/g);
        const denied = (options.getString('interdits') ?? '').split(/ +/g);
        const winnerCount = options.getInteger('gagnants');

        await interaction.deferReply();

        const gw = await interaction.client.giveaways.createGiveaway({
            guild_id: interaction.guild.id,
            channel,
            winnerCount,
            bonus_roles: bonuses.length > 0 ? bonuses : [],
            reward,
            required_roles: required.length > 0 ? required : [],
            denied_roles: denied.length > 0 ? denied : [],
            hoster_id: interaction.guild.id,
            time: time
        }).catch(console.log) as Giveaway;

        if (!gw) return interaction.editReply({
            embeds: [ basicEmbed(interaction.user)
                .setColor(evokerColor(interaction.guild))
                .setTitle("Erreur")
                .setDescription(`Une erreur a eu lieu lors de l'interaction avec la base de données.`)
            ],
        }).catch(() => {});

        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Giveaway crée")
                .setDescription(`Le giveaway avec la récompense **${reward}** a été crée dans ${pingChan(channel)}.\nIl se finit ${displayDate(time + Date.now())} avec ${numerize(winnerCount)} gagnant${plurial(winnerCount)}`)
            ]
        }).catch(() => {});
    }
});