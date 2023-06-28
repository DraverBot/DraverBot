import { MessageCreateOptions, TextChannel } from 'discord.js';
import { Process } from '../structures/Process';
import { log4js } from 'amethystjs';

export default new Process(
    'send and delete',
    async (content: MessageCreateOptions, channel: TextChannel, time = 10000) => {
        const rep = await channel.send(content).catch(log4js.trace);
        if (!rep) return;

        setTimeout(() => {
            rep.delete().catch(log4js.trace);
        }, time);
    }
);
