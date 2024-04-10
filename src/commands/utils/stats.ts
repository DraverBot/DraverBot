import { DraverCommand } from '../../structures/DraverCommand';
import { log4js } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import axios from 'axios';
import replies from '../../data/replies';
import { ChessPlayer, ChessStats, LichessStats } from '../../typings/apis';
import { basicEmbed, displayDate, numerize, plurial } from '../../utils/toolbox';

export default new DraverCommand({
    name: 'statistiques',
    module: 'fun',
    description: "Envoie les statistiques d'un joueur d'un jeu",
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'chesscom',
            description: "Envoie les statistiques d'un joueur chess.com",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'pseudo',
                    description: "Pseudo de l'utilisateur que vous voulez voir",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'lichess',
            description: "Envoie les statistiques d'un joueur sur lichess.org",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'pseudo',
                    description: "Pseudo de l'utilisateur que vous voulez voir",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'chesscom') {
        const username = options.getString('pseudo');
        await interaction.deferReply().catch(log4js.trace);

        const informations = await Promise.all([
            axios(`https://api.chess.com/pub/player/${username.replace(/ +/g, '+')}`).catch(log4js.trace),
            axios(`https://api.chess.com/pub/player/${username.replace(/ +/g, '+')}/stats`).catch(log4js.trace)
        ]);
        const overview = informations[0];

        if (overview && overview.data && overview.status === 404)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Utilisateur introuvable')
                            .setDescription(`Cet utilisateur n'existe pas`)
                    ]
                })
                .catch(log4js.trace);
        if (!overview || !overview.data || overview.status !== 200)
            return interaction
                .editReply({
                    embeds: [replies.requestStopped((interaction.member as GuildMember) ?? interaction.user, interaction)]
                })
                .catch(log4js.trace);
        const data = overview.data as ChessPlayer;
        const country = data.country.split('/')[5];
        const statsRep = informations[1];
        if (!statsRep || !statsRep.data || statsRep.status !== 200) {
            return interaction.editReply({
                embeds: [replies.requestStopped((interaction.member as GuildMember) ?? interaction.user, interaction)]
            });
        }
        const { chess_blitz, chess_rapid, chess_bullet, tactics, ...stats } = statsRep.data as ChessStats;

        const info = basicEmbed(interaction.user, { draverColor: true })
            .setTitle('Statistiques Chess.com')
            .setDescription(
                `Voici les statistiques de ${data.username} sur [chess.com](https://chess.com)\n${
                    country !== 'XX' ? `:flag_${country.toLowerCase()}:` : ''
                } Nom d'utilisateur : \`${data.username}\` ( ${numerize(data.followers)} follower${plurial(
                    data.followers
                )} )\n\nA rejoint ${displayDate(data.joined * 1000)}${
                    stats.fide > 0 ? `Classement FIDE : \`${numerize(stats.fide)}\`` : ''
                }`
            )
            .setURL(data.url)
            .setFields(
                {
                    name: 'Rapide',
                    value: `Classement : \`${numerize(chess_rapid.last.rating)}\`\nMeilleur : \`${numerize(
                        chess_rapid.best.rating
                    )}\`\nV/D/N : \`${numerize(chess_rapid.record.win)}/${numerize(chess_rapid.record.loss)}/${numerize(
                        chess_rapid.record.draw
                    )}\`\nTaux de victoire : \`${(
                        (chess_rapid.record.win /
                            (chess_rapid.record.loss + chess_rapid.record.draw + chess_rapid.record.win)) *
                        100
                    ).toFixed(1)}%\``,
                    inline: true
                },
                {
                    name: 'Blitz',
                    value: `Classement : \`${numerize(chess_blitz.last.rating)}\`\nMeilleur : \`${numerize(
                        chess_blitz.best.rating
                    )}\`\nV/D/N : \`${numerize(chess_blitz.record.win)}/${numerize(chess_blitz.record.loss)}/${numerize(
                        chess_blitz.record.draw
                    )}\`\nTaux de victoire : \`${(
                        (chess_blitz.record.win /
                            (chess_blitz.record.loss + chess_blitz.record.draw + chess_blitz.record.win)) *
                        100
                    ).toFixed(1)}%\``,
                    inline: true
                },
                {
                    name: 'Bullet',
                    value: `Classement : \`${numerize(chess_bullet.last.rating)}\`\nMeilleur : \`${numerize(
                        chess_bullet.best.rating
                    )}\`\nV/D/N : \`${numerize(chess_bullet.record.win)}/${numerize(
                        chess_bullet.record.loss
                    )}/${numerize(chess_bullet.record.draw)}\`\nTaux de victoire : \`${(
                        (chess_bullet.record.win /
                            (chess_bullet.record.loss + chess_bullet.record.draw + chess_bullet.record.win)) *
                        100
                    ).toFixed(1)}%\``,
                    inline: true
                },
                {
                    name: 'Problèmes',
                    value: `Meilleur : \`${numerize(tactics.highest.rating)}\`\nPlus bas : \`${numerize(
                        tactics.lowest.rating
                    )}\``,
                    inline: false
                }
            )
            .setThumbnail(
                data?.avatar ??
                    'https://media.discordapp.net/attachments/1093914608353411194/1124008230390083614/noavatar_l.png'
            );

        interaction.editReply({ embeds: [info] }).catch(log4js.trace);
    }
    if (cmd === 'lichess') {
        const username = options.getString('pseudo').replace(/ +/g, '+');
        const rep = await Promise.all([
            interaction.deferReply().catch(log4js.trace),
            axios(`https://lichess.org/api/user/${username}`).catch(log4js.trace)
        ]);

        const res = rep[1];
        if (res && res.data && res.status === 404)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Utilisateur introuvable')
                            .setDescription(`Cet utilisateur n'existe pas`)
                    ]
                })
                .catch(log4js.trace);
        if (!res || !res.data || res.status !== 200)
            return interaction
                .editReply({
                    embeds: [replies.requestStopped((interaction.member as GuildMember) ?? interaction.user, interaction)]
                })
                .catch(log4js.trace);

        const { createdAt, perfs, url, ...data } = res.data as LichessStats;

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Statistiques lichess.org')
                        .setURL(url)
                        .setDescription(
                            `Voici les statistiques de ${
                                data.username
                            } sur [lichess.org](https://lichess.org)\nNom d'utilisateur : \`${
                                data.username
                            }\`\nA rejoint ${displayDate(createdAt)}`
                        )
                        .setFields(
                            {
                                name: 'Rapide',
                                value: `Classement : \`${numerize(perfs.rapid.rating)}\``,
                                inline: true
                            },
                            {
                                name: 'Blitz',
                                value: `Classement : \`${numerize(perfs.blitz.rating)}\``,
                                inline: true
                            },
                            {
                                name: 'Bullet',
                                value: `Classement : \`${numerize(perfs.bullet.rating)}\``,
                                inline: true
                            }
                        )
                ]
            })
            .catch(log4js.trace);
    }
});
