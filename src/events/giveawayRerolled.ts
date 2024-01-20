import { modulesManager } from '../cache/managers';
import { AmethystEvent } from 'amethystjs';
import { getMsgUrl, pingUser, sendError } from '../utils/toolbox';
import { giveawayEmbeds } from '../data/giveaway';

export default new AmethystEvent('giveawayRerolled', (gw, channel, oldW, newW) => {
    if (!modulesManager.enabled(gw.guild_id, 'giveaways')) return;

    channel
        .send({
            content: newW.map(pingUser).join(' ') ?? 'Pas de gagnants',
            embeds: [giveawayEmbeds.winners(newW, gw, getMsgUrl(gw))],
            reply: {
                messageReference: gw.message_id
            }
        })
        .catch(sendError);
});
