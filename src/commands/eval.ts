import { AmethystCommand } from 'amethystjs';
import dev from '../preconditions/dev';
import { codeBox } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'eval',
    preconditions: [dev],
    description: 'Eval'
}).setMessageRun(async ({ message, options }) => {
    if (options.emptyArgs) return;
    const run = new Promise((resolve) => {
        resolve(eval(options.args.join(' ')));
    });

    run.catch((error) => {
        message.reply(codeBox(error, 'js'));
    });
    run.then((result) => {
        if (result) message.reply(codeBox(result as string, 'js'));
    });
});
