import { AmethystCommand } from 'amethystjs';
import { TextChannel } from 'discord.js';

export default new AmethystCommand({
    name: 'test',
    description: 'Test'
}).setMessageRun(async ({ message }) => {
    message.client.tasksManager.create({
        name: 'Test',
        description: 'Tester le manager de tâches',
        image: message.author.displayAvatarURL({ forceStatic: true }),
        by: message.author,
        channel: message.channel as TextChannel
    });
});
