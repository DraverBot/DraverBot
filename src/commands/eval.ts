import { DraverCommand } from '../structures/DraverCommand';
import dev from '../preconditions/dev';
import { codeBox } from '../utils/toolbox';

export default new DraverCommand({
    name: 'eval',
    module: 'dev',
    preconditions: [dev],
    description: 'Eval'
}).setMessageRun(async ({ message, options }) => {
    if (options.emptyArgs) return message.reply('Mettez des arguments valides');
    const run = new Promise((resolve) => {
        resolve(eval(options.args.join(' ')));
    });

    run.catch((error) => {
        message.reply(codeBox(error, 'js'));
    });
    run.then((result) => {
        if (result) message.reply(codeBox(result as string, 'js'));
        else message.reply('Pas de résultat');
    });
});
