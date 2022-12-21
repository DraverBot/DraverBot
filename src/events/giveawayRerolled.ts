import { AmethystEvent } from 'amethystjs';
import { getMsgUrl, pingUser } from '../utils/toolbox';
import { giveawayEmbeds } from '../data/giveaway';

export default new AmethystEvent('giveawayRerolled', (gw, channel, oldW, newW) => {
    if (!channel.client.modulesManager.enabled(gw.guild_id, 'giveaways')) return;

    channel
        .send({
            content: newW.map(pingUser).join(' ') ?? 'Pas de gagnants',
            embeds: [giveawayEmbeds.winners(newW, getMsgUrl(gw))],
            reply: {
                messageReference: gw.message_id
            }
        })
        .catch(() => {});
});
