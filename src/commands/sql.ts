import { DraverCommand } from '../structures/DraverCommand';
import dev from '../preconditions/dev';
import query from '../utils/query';
import { resizeString } from '../utils/toolbox';

export default new DraverCommand({
    name: 'sql',
    module: 'dev',
    preconditions: [dev],
    description: 'Fait une requête SQL'
}).setMessageRun(async ({ message, options }) => {
    const req = options.args.join(' ');
    let error = '';
    const res = await query(req).catch((err) => {
        error = err;
    });

    const box = (str: string, type = 'sql') => `\`\`\`${type}\n${str}\`\`\``;

    if (!res)
        return message.channel
            .send({
                content: resizeString({
                    str: box(error),
                    length: 2000
                }),
                reply: {
                    messageReference: message
                }
            })
            .catch(() => {});
    message.channel
        .send({
            content: resizeString({
                str: box(JSON.stringify(res), 'json'),
                length: 2000
            }),
            reply: {
                messageReference: message
            }
        })
        .catch(() => {});
});
