import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { AttachmentBuilder } from 'discord.js';
import { systemReply } from '../utils/toolbox';

export default new ButtonHandler({
    customId: ButtonIds.DownloadSqlLogs,
    preconditions: [dev]
}).setRun(async ({ button }) => {
    button
        .reply({
            files: [
                new AttachmentBuilder('./dist/data/sqllogs.json')
                    .setName('Logs SQL')
                    .setDescription('Logs des requêtes SQL')
            ],
            content: '`sqllogs.json`',
            ephemeral: true
        })
        .catch((error) => {
            systemReply(button, {
                content: `Je n'ai pas pu envoyer le message: \`${error}\``,
                ephemeral: true
            }).catch(() => {});
        });
});
