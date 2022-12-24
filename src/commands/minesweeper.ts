import { AmethystCommand } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { random } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'démineur',
    description: 'Joue au démineur sur Discord',
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'bombes',
            description: 'Nombre de bombes dans le jeu',
            minValue: 1,
            maxValue: 25,
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: 'maximum',
            description: 'Nombre maximum de bombes dans le jeu',
            minValue: 1,
            maxValue: 25,
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: 'minimum',
            description: 'Nombre minimum de bombes dans le jeu',
            required: false,
            type: ApplicationCommandOptionType.Integer,
            minValue: 1,
            maxValue: 25
        }
    ]
}).setChatInputRun(({ interaction, options }) => {
    const size = 10;
    const fixed = options.getInteger('bombes');
    const max = options.getInteger('maximum') ?? 10;
    const min = options.getInteger('minimum') ?? 5;

    const cases = {};

    for (let x = 0; x < size; x++) {
        cases[x] = {};

        for (let y = 0; y < size; y++) {
            cases[x][y] = {
                mined: false,
                value: 0
            };
        }
    }

    const numberOfMines = fixed ?? random({ max, min });
    for (let i = 0; i < numberOfMines; i++) {
        const x = random({ max: 9 });
        const y = random({ max: 9 });

        cases[x][y].mined = true;
    }

    const getNumberOfMines = (xx: string, yy: string) => {
        const x = parseInt(xx);
        const y = parseInt(yy);

        if (cases[x][y].mined) {
            return false;
        }

        let counter = 0;
        const hasLeft = y > 0;
        const hasRight = y < 9 - 1;
        const hasTop = x > 0;
        const hasBottom = x < 9 - 1;

        counter += +(hasTop && hasLeft && cases[x - 1][y - 1].mined);
        counter += +(hasTop && cases[x - 1][y].mined);
        counter += +(hasTop && hasRight && cases[x - 1][y + 1].mined);

        counter += +(hasLeft && cases[x][y - 1].mined);
        counter += +(hasRight && cases[x][y + 1].mined);
        counter += +(hasBottom && hasLeft && cases[x + 1][y - 1].mined);

        counter += +(hasBottom && cases[x + 1][y].mined);
        counter += +(hasBottom && hasRight && cases[x + 1][y + 1].mined);

        return counter;
    };

    Object.keys(cases).forEach((x) => {
        Object.keys(cases[x]).forEach((y) => {
            const selected = cases[x][y];
            if (!selected.mined) {
                cases[x][y].value = getNumberOfMines(x, y);
            }
        });
    });

    let content = '';
    for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
            const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
            const selected = cases[x][y];
            if (selected.mined) content += '||:bomb:||';
            else content += `||${emojis[selected.value]}||`;
        }

        content += '\n';
    }

    interaction.reply(content).catch(() => {});
});
