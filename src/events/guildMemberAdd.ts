import { AmethystEvent } from 'amethystjs';
import { replaceFluxVariables } from '../utils/vars';
import { TextChannel } from 'discord.js';
import query from '../utils/query';
import { DatabaseTables, joinRoles } from '../typings/database';
import { addModLog, basicEmbed, evokerColor, sendError } from '../utils/toolbox';

export default new AmethystEvent('guildMemberAdd', async (member) => {
    const guild = member.guild;

    const configs = {
        msg: guild.client.configsManager.getValue(guild.id, 'join_message'),
        enabled: guild.client.configsManager.getValue(guild.id, 'join_active'),
        channel: guild.client.configsManager.getValue(guild.id, 'join_channel'),
        roles: guild.client.configsManager.getValue(member.guild.id, 'join_roles'),
        gban: guild.client.configsManager.getValue(guild.id, 'gban'),
        gbanAction: guild.client.configsManager.getValue(guild.id, 'gban_ban') ? 'ban' : 'kick'
    };

    if (configs.gban && member.client.GBan.isGbanned(member.id)) {
        await member
            .send({
                embeds: [
                    basicEmbed(member.user)
                        .setTitle('🚫 GBanni')
                        .setDescription(
                            `Vous êtes **GBanni** de Draver, ce qui signifie que vous ne pouvez rejoindre aucun serveur dont le système est activé.\nVous avez donc été ${
                                configs.gbanAction === 'ban' ? 'banni' : 'expulsé'
                            } de ${member.guild.name}.`
                        )
                        .setColor(evokerColor(member.guild))
                ]
            })
            .catch(() => {});

        if (configs.gbanAction === 'ban') {
            member
                .ban({
                    reason: `Utilisateur GBanni`
                })
                .catch(() => {});
        } else {
            await member.kick(`Membre GBanni`).catch(() => {});
        }

        addModLog({
            guild: member.guild,
            member_id: member.id,
            mod_id: member.client.user.id,
            reason: `Utilisateur GBanni`,
            type: 'Ban'
        }).catch(() => {});
    }
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
