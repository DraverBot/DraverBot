import { modulesManager } from '../cache/managers';
import { AmethystEvent } from 'amethystjs';
import { getMsgUrl, pingUser, sendError } from '../utils/toolbox';
import { giveawayEmbeds } from '../data/giveaway';

export default new AmethystEvent('giveawayEnded', (giveaway, channel, winners) => {
    if (!modulesManager.enabled(giveaway.guild_id, 'giveaways')) return;

    channel
        .send({
            content: winners.map(pingUser).join(' ') ?? 'Pas de gagnants',
            embeds: [giveawayEmbeds.winners(winners, giveaway, getMsgUrl(giveaway))],
            reply: {
                messageReference: giveaway.message_id
            }
        })
        .catch(sendError);
});
