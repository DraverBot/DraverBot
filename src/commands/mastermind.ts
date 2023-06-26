import { AmethystCommand } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { Mastermind } from '../structures/Mastermind';

export default new AmethystCommand({
    name: 'mastermind',
    description: 'Lance une partie de Mastermind',
    options: [
        {
            name: 'colonnes',
            description: 'Nombre de colonnes',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: [
                {
                    name: '4',
                    value: 4
                },
                {
                    name: '5',
                    value: 5
                }
            ]
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const rows = (options.getInteger('colonnes') ?? 4) as 4 | 5;
    new Mastermind({
        rows,
        colors: rows === 4 ? 6 : 8,
        interaction,
        user: interaction.user,
        maxTries: 12
    });
});
