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

    const sendIn = member.guild.channels.cache.get(channelID) as TextChannel ?? channel;
    console.log(sendIn);
    sendIn.send(msg).catch(() => {});
})