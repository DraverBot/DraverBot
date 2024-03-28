import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { dumpDatabase } from '../utils/toolbox';

export default new ButtonHandler({
    customId: ButtonIds.SaveDatabase,
    preconditions: [dev]
}).setRun(async ({ button }) => {
    button.deferUpdate().catch(log4js.trace);

    dumpDatabase();
});
