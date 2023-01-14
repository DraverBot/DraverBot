import { AmethystEvent } from 'amethystjs';
import { replaceFluxVariables } from '../utils/vars';
import { TextChannel } from 'discord.js';
import query from '../utils/query';
import { DatabaseTables, joinRoles } from '../typings/database';
import { sendError } from '../utils/toolbox';

export default new AmethystEvent('guildMemberAdd', async (member) => {
    const guild = member.guild;

    const configs = {
        msg: guild.client.configsManager.getValue(guild.id, 'join_message'),
        enabled: guild.client.configsManager.getValue(guild.id, 'join_active'),
        channel: guild.client.configsManager.getValue(guild.id, 'join_channel'),
        roles: guild.client.configsManager.getValue(member.guild.id, 'join_roles')
    };

    if (configs.roles && !member.user.bot) {
        const roles = await query<joinRoles>(
            `SELECT roles FROM ${DatabaseTables.JoinRoles} WHERE guild_id='${member.guild.id}'`
        );

        if (roles.length > 0) {
            const list = JSON.parse(roles[0].roles) as string[];
            await member.guild.roles.fetch();

            const rolesList = member.guild.roles.cache.filter((x) => list.includes(x.id));
            member.roles.add(rolesList).catch(sendError);
        }
    }

    if (!configs.enabled) return;
    const channel = guild.channels.cache.get(configs.channel as string);

    if (!channel) return;

    const msg = replaceFluxVariables({
        msg: configs.msg as string,
        member,
        guild
    });

    (channel as TextChannel).send(msg).catch(sendError);
});
