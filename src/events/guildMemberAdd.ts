import { AmethystEvent } from 'amethystjs';
import { replaceFluxVariables } from '../utils/vars';
import { TextChannel } from 'discord.js';
import { boolDb } from '../utils/toolbox';

export default new AmethystEvent('guildMemberAdd', (member) => {
    const guild = member.guild;

    const configs = {
        msg: guild.client.configsManager.getValue(guild.id, 'join_message'),
        enabled: boolDb(guild.client.configsManager.getValue(guild.id, 'join_active')),
        channel: guild.client.configsManager.getValue(guild.id, 'join_channel')
    };

    if (!configs.enabled) return;
    const channel = guild.channels.cache.get(configs.channel as string);

    if (!channel) return;

    const msg = replaceFluxVariables({
        msg: configs.msg as string,
        member,
        guild
    });

    (channel as TextChannel).send(msg).catch(() => {});
});
