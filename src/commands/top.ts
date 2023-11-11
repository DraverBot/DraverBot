import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import replies from '../data/replies';
import moduleEnabled from '../preconditions/moduleEnabled';
import { moduleType } from '../typings/database';
import { util } from '../utils/functions';
import { basicEmbed, evokerColor, numerize, pagination, plurial, subcmd } from '../utils/toolbox';

export default new DraverCommand({
    name: 'classement',
    module: 'information',
    description: 'Affiche les classements du serveur',
    options: [
        {
            name: 'monnaie',
            description: `Affiche le classement des ${util('coins')} du serveur`,
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'niveaux',
            description: 'Affiche le classement des niveaux du serveur',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'invitations',
            description: 'Affiche le classement des invitations',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const top = subcmd(options) as 'monnaie' | 'niveaux' | 'invitations';

    const types: Record<typeof top, moduleType> = {
        monnaie: 'economy',
        niveaux: 'level',
        invitations: 'invitations'
    };
    const lbT: Record<typeof top, string> = {
        monnaie: util('coins'),
        niveaux: 'niveaux',
        invitations: 'invitations'
    };

    if (!interaction.client.modulesManager.enabled(interaction.guild.id, types[top]))
        return interaction
            .reply({
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: types[top] })],
                ephemeral: true
            })
            .catch(() => {});

    const leaderboard =
        top === 'monnaie'
            ? interaction.client.coinsManager.getLeaderboard(interaction.guild.id)
            : top === 'invitations'
            ? interaction.client.invitesManager.getLeaderboard(interaction.guild.id).toJSON()
            : interaction.client.levelsManager.leaderboard(interaction.guild.id).toJSON();

    const map = (embed: EmbedBuilder, data: any) => {
        const index = leaderboard.indexOf(data as any);
        const dt = data as any;

        return embed.addFields({
            name: `${numerize(index + 1)}°`,
            value: `<@${data.user_id}>\n> ${
                top === 'niveaux'
                    ? `Niveau ${numerize(dt.level)}`
                    : top === 'monnaie'
                    ? `${numerize(dt.coins + dt.bank)} ${util('coins')}`
                    : `${dt.total - (dt.fakes + dt.leaves)} invitation${plurial(dt.total - (dt.fakes + dt.leaves))}`
            }`,
            inline: false
        });
    };

    if (leaderboard.length === 0)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Pas de classement')
                        .setDescription(`Personne n'est classé sur le serveur`)
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    const basic = () => {
        return basicEmbed(interaction.user)
            .setColor(interaction.guild.members.me.displayHexColor)
            .setTitle(`Classement`)
            .setDescription(`Voici le classement des ${lbT[top]} du serveur`);
    };

    if (leaderboard.length <= 5) {
        const embed = basic();
        for (const d of leaderboard) {
            map(embed, d);
        }

        interaction
            .reply({
                embeds: [embed]
            })
            .catch(() => {});
    } else {
        const embeds = [basic()];

        leaderboard.forEach((v, i) => {
            if (i % 5 === 0 && i > 0) embeds.push(basic());

            map(embeds[embeds.length - 1], v);
        });

        pagination({
            interaction,
            user: interaction.user,
            embeds
        });
    }
});
