import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import replies from "../data/replies";
import moduleEnabled from "../preconditions/moduleEnabled";
import { moduleType } from "../typings/database";
import { levels } from "../typings/managers";
import { util } from "../utils/functions";
import { basicEmbed, evokerColor, numerize, pagination, subcmd } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'classement',
    description: "Affiche les classements du serveur",
    options: [
        {
            name: 'monnaie',
            description: `Affiche le classement des ${util('coins')} du serveur`,
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'niveaux',
            description: "Affiche le classement des niveaux du serveur",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    preconditions: [ preconditions.GuildOnly, moduleEnabled ]
}).setChatInputRun(async({ interaction, options }) => {
    const top = subcmd(options) as 'monnaie' | 'niveaux';

    const types: Record<typeof top, moduleType> = {
        monnaie: 'economy',
        niveaux: 'level'
    };
    const lbT: Record<typeof top, string> = {
        monnaie: util('coins'),
        niveaux: 'niveaux'
    }

    if (!interaction.client.modulesManager.enabled(interaction.guild.id, types[top])) return interaction.reply({
        embeds: [ replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: types[top] }) ],
        ephemeral: true
    }).catch(() => {});

    const leaderboard = top === 'monnaie' ? interaction.client.coinsManager.getLeaderboard(interaction.guild.id) : interaction.client.levelsManager.leaderboard(interaction.guild.id).toJSON();

    const map = (embed: EmbedBuilder, data: any) => {
        const index = leaderboard.indexOf(data as any);
        const isLevel = (data as levels)?.level !== undefined;
        
        const dt = data as any

        return embed.addFields(
            {
                name: `${numerize(index + 1)}°`,
                value: `<@${data.user_id}>\n> ${isLevel ? `Niveau ${numerize(dt.level)}`:`${numerize(dt.coins + dt.bank)} ${util('coins')}`}`,
                inline: false
            }
        )
    }

    if (leaderboard.length === 0) return interaction.reply({
        embeds: [ basicEmbed(interaction.user)
            .setTitle("Pas de classement")
            .setDescription(`Personne n'est classé sur le serveur`)
            .setColor(evokerColor(interaction.guild))
        ]
    }).catch(() => {});

    const basic = () => {
        return basicEmbed(interaction.user)
            .setColor(interaction.guild.members.me.displayHexColor)
            .setTitle(`Classement`)
            .setDescription(`Voici le classement des ${lbT[top]} du serveur`)
    }

    if (leaderboard.length <= 5) {
        const embed = basic();
        for (const d of leaderboard) {
            map(embed, d)
        }

        interaction.reply({
            embeds: [ embed ]
        }).catch(() => {});
    } else {
        const embeds = [ basic() ];

        leaderboard.forEach((v, i) => {
            if (i % 5 === 0 && i > 0) embeds.push(basic());

            map(embeds[embeds.length - 1], v);
        })

        pagination({
            interaction,
            user: interaction.user,
            embeds
        });
    }
})