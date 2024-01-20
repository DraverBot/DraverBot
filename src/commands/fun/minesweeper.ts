import { DraverCommand } from '../../structures/DraverCommand';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import GenerateMinesweeperBoard from '../../process/GenerateMinesweeperBoard';

export default new DraverCommand({
    name: 'démineur',
    module: 'fun',
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

    const board = GenerateMinesweeperBoard.process({ size, max, min, fixed });

    interaction.reply(board).catch(() => {});
});
