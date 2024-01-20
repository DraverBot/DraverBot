import { buildButton, displayDate, numerize, pingRole, pingUser, plurial } from '../utils/toolbox';
import { EmbedBuilder } from 'discord.js';
import { util } from '../utils/functions';
import { embedsInputData } from '../typings/embeds';
import { buttonsInputData } from '../typings/buttons';

const thisGw = (url: string) => `[**ce giveaway**](${url})`;

type customInput = giveawayInput & {
    endsAt: number;
};


export const giveawayEmbeds: embedsInputData = {
    giveaway: (data: customInput & { participants: string[] }) => {
        const full = database.giveaways.fetchGiveaway(data.channel.id, false);
        const date = parseInt((full?.endsAt ?? data.time + Date.now()).toString());
        data.participants = data.participants ?? [];

        const embed = new EmbedBuilder()
            .setTitle('🎉 Giveaway 🎉')
            .setDescription(
                `<@${data.hoster_id}> offre un giveaway !\nIl y a ${numerize(
                    data.participants.length
                )} participant${plurial(data.participants.length, {})} pour ${numerize(
                    data.winnerCount
                )} gagnant${plurial(data.winnerCount, {})}\n\nAppuyez sur le bouton pour tenter de gagner : __${
                    data.reward
                }__\nLe giveaway prendra fin ${displayDate(data.time + Date.now())}`
            )
            .setTimestamp()
            .setColor(util('accentColor'));

        if (data.required_invitations && data.required_invitations > 0) {
            embed.addFields({
                name: 'Invitations',
                value: `${numerize(data.required_invitations)} invitation${plurial(data.required_invitations)}`,
                inline: true
            });
        }
        if (data.required_level && data.required_level > 0) {
            embed.addFields({
                name: 'Niveau',
                value: `Niveau ${numerize(data.required_level)} minimum`,
                inline: true
            });
        }
        if (data.bonus_roles && data.bonus_roles.length > 0) {
            embed.addFields({
                name: 'Rôles bonus',
                value: data.bonus_roles?.map((x) => pingRole(x)).join(' ') ?? '',
                inline: false
            });
        }
        if (data.denied_roles && data.denied_roles.length > 0) {
            embed.addFields({
                name: 'Rôles interdits',
                value: data.denied_roles?.map((x) => pingRole(x)).join(' ') ?? '',
                inline: false
            });
        }
        if (data.required_roles && data.required_roles.length > 0) {
            embed.addFields({
                name: 'Rôles requis',
                value: data.required_roles?.map((x) => pingRole(x)).join(' ') ?? '',
                inline: false
            });
        }
        return embed;
    },
    alreadyParticipate: (url) => {
        return new EmbedBuilder()
            .setTitle(`Participation déjà enregistrée`)
            .setDescription(`Vous participez déjà à ${thisGw(url)}`)
            .setColor('#ff0000');
    },
    ended: (data, winners) => {
        return new EmbedBuilder()
            .setTitle('Giveaway terminé')
            .setDescription(
                `${data.reward}\n\nLe giveaway est terminé.\n${
                    winners.length > 0
                        ? `Le${plurial(winners.length)} gagnant${plurial(winners.length, {
                              singular: ' est',
                              plurial: 's sont'
                          })} ${winners.map((x) => pingUser(x)).join(' ')}`
                        : `Il n'y a aucun gagnant.`
                }\n\n:tada: *${numerize(data.participants?.length)} participant${plurial(data.participants.length)}*`
            )
            .setColor('#ff0000');
    },
    entryAllowed: (url) => {
        return new EmbedBuilder()
            .setTitle('Particpation acceptée')
            .setDescription(`Votre participation à ${thisGw(url)} a été acceptée`)
            .setColor('#00ff00');
    },
    hasDeniedRoles: (roles, url) => {
        return new EmbedBuilder()
            .setTitle('Participation refusée')
            .setDescription(
                `Votre participation à ${thisGw(url)} a été refusée, car vous possédez l'un de ces rôles : ${roles
                    .map(pingRole)
                    .join(' ')}`
            )
            .setColor('#ff0000');
    },
    missingRequiredRoles: (roles, url) => {
        return new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(
                `Votre participation à ${thisGw(url)} a été refusée, car vous n'avez pas tout ces rôles : ${roles
                    .map(pingRole)
                    .join(' ')}`
            )
            .setTitle('Participation refusée');
    },
    noEntries: (url) => {
        return new EmbedBuilder()
            .setTitle('Pas de participations')
            .setDescription(`Aucune participation n'a été enregistrée pour ${thisGw(url)}`)
            .setColor('#ff0000');
    },
    notParticipated: (url) => {
        return new EmbedBuilder()
            .setTitle('Pas de participation')
            .setDescription(`Vous ne participez pas à ${thisGw(url)}`)
            .setColor('#ff0000');
    },
    participationRegistered: (url) => {
        return new EmbedBuilder()
            .setTitle('Participation enregistrée')
            .setDescription(`Votre participation à ${thisGw(url)} a été enregistrée`)
            .setColor('#00ff00');
    },
    removeParticipation: (url) => {
        return new EmbedBuilder()
            .setTitle(`Participation supprimée`)
            .setDescription(`Votre participation à ${thisGw(url)} a été supprimée`)
            .setColor('#ff0000');
    },
    winners: (winners, data, url) => {
        return new EmbedBuilder()
            .setTitle('Gagnants')
            .setDescription(
                `[**Le giveaway**](${url}) a pris fin.\n` +
                    (winners.length > 0
                        ? `Le${plurial(winners.length)} gagnant${plurial(winners.length, {
                              singular: ' est',
                              plurial: 's sont'
                          })} ${winners.map(pingUser).join(' ')}`
                        : "Il n'y a pas de gagnants")
            )
            .setColor('#ff0000');
    },
    notEnoughInvitations: (invitations: number, url: string) => {
        return new EmbedBuilder()
            .setTitle('Invitations')
            .setDescription(
                `Vous ne pouvez pas participer à ${thisGw(url)}, car vous n'avez pas assez d'invitations ( **${numerize(
                    invitations
                )}** nécessaire${plurial(invitations)} )`
            )
            .setColor('#ff0000');
    },
    notEnoughLevel: (level: number, url: string) => {
        return new EmbedBuilder()
            .setTitle('Niveau')
            .setDescription(
                `Vous ne pouvez pas participer à ${thisGw(url)}, car vous n'avez pas assez de niveaux ( **${numerize(
                    level
                )}** nécessaire${plurial(level)} )`
            )
            .setColor('#ff0000');
    }
};

export const giveawayButtons: buttonsInputData = {
    participate: () => {
        return buildButton({
            label: 'Participer',
            emoji: '🎉',
            style: 'Success',
            id: 'gw-participate'
        });
    },
    cancelParticipation: () => {
        return buildButton({
            label: 'Annuler',
            style: 'Danger',
            id: 'gw-unparticipate'
        });
    }
};
