import { configsManager } from '../cache/managers';
import { AmethystEvent } from 'amethystjs';
import { TextChannel } from 'discord.js';
import { replaceLevelVariables } from '../utils/vars';
import { sendError } from '../utils/toolbox';

export default new AmethystEvent('levelUp', async (member, level, channel) => {
    const msg = replaceLevelVariables({
        msg: configsManager.getValue<string>(member.guild.id, 'level_msg'),
        level,
        channel,
        member
    });

    const channelID = configsManager.getValue<string>(member.guild.id, 'level_channel') ?? channel.id;

    const sendIn = (member.guild.channels.cache.get(channelID) as TextChannel) ?? channel;
    sendIn.send(msg).catch(sendError);
});
