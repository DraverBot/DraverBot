import { AmethystEvent, log4js } from 'amethystjs';
import { configsManager } from '../cache/managers';
import { addModLog, pingChan } from '../utils/toolbox';

export default new AmethystEvent('messageDelete', (message) => {
    if (!message.guild) return;
    const cleanUsers = message.mentions.users?.filter((x) => x.id !== message.author.id);
    if (
        cleanUsers?.size ||
        (message.mentions.roles?.size && configsManager.getValue(message.guild.id, 'ghost_monitor'))
    ) {
        const reason = `Dans ${pingChan(message.channel.id)} ( \`${message.channel.id}\` ) : ${(() => {
            let content = '';
            if (message.mentions.roles?.size)
                content += '\nRôles : ' + message.mentions.roles.map((r) => `<@&${r.id}> ( \`${r.id}\` )`).join(', ');
            if (cleanUsers?.size)
                content += content.length
                    ? '\n'
                    : '' + 'Utilisateurs : ' + cleanUsers.map((u) => `<@${u.id}> ( \`${u.id}\` )`).join(', ');
            return content;
        })()}`;

        addModLog({
            guild: message.guild,
            member_id: message.author.id,
            mod_id: message.client.user.id,
            type: 'GhostPing',
            reason: reason
        }).catch(log4js.trace);
    }
});
