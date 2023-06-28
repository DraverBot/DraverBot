import { Process } from '../structures/Process';
import { ButtonIds } from '../typings/buttons';
import { buildButton, random, row } from '../utils/toolbox';
import { util } from '../utils/functions';

export default new Process('default game component', () => {
    const ids = [
        {
            name: 'Jouer au Mastermind (facile)',
            id: ButtonIds.PlayMastermindEasy
        },
        {
            name: 'Jouer au Mastermind (difficile)',
            id: ButtonIds.PlayMastermindHard
        },
        {
            name: 'Jouer au démineur',
            id: ButtonIds.PlayMinesweeper
        }
    ];

    const display = random({ max: 100, min: 0 }) < util<number>('gameOdd') * 100;
    if (!display) return [];

    const id = ids[random({ max: ids.length })];
    return [row(buildButton({ label: id.name, id: id.id, style: 'Secondary' }))];
});
