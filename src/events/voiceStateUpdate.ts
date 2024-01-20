import { configsManager } from '../cache/managers';
import { AmethystEvent, log4js } from 'amethystjs';

export default new AmethystEvent('voiceStateUpdate', (bef, aft) => {
    if (bef.member.user.bot) return;
    const client = bef.client;

    const role = (method: 'add' | 'remove') => {
        if (!configsManager.getValue(aft.guild.id, 'voice_role_enabled')) return;
        const id = configsManager.getValue<string>(aft.guild.id, 'voice_role');

        if (id.length === 0) return;

        aft.member.roles[method](id).catch(log4js.trace);
    };

    if (!bef.channel && aft.channel) role('add');
    if (bef.channel && !aft.channel) role('remove');
});
