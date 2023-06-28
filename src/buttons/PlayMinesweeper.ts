import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import GenerateMinesweeperBoard from '../process/GenerateMinesweeperBoard';

export default new ButtonHandler({
    customId: ButtonIds.PlayMinesweeper
}).setRun(({ button }) => {
    const board = GenerateMinesweeperBoard.process({
        size: 10,
        max: 20,
        min: 12
    });

    button.reply({ ephemeral: true, content: board }).catch(log4js.trace);
});
