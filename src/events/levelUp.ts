import { AmethystEvent } from "amethystjs";
import { TextChannel } from "discord.js";
import { replaceLevelVariables } from "../utils/vars";

export default new AmethystEvent('levelUp', async(member, level, channel) => {
    const msg = replaceLevelVariables({
        msg: member.client.configsManager.getValue<string>(member.guild.id, 'level_msg'),
        level,
        channel,
        member
    });

    const channelID = member.client.configsManager.getValue<string>(member.guild.id, 'level_channel') ?? channel.id;

    const sendIn = await member.guild.channels.fetch(channelID).catch(() => {}) as TextChannel ?? channel;
    sendIn.send(msg).catch(() => {});
})