import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import { Mastermind } from '../structures/Mastermind';
import { row } from '../utils/toolbox';
import { ButtonBuilder } from 'discord.js';

export default new ButtonHandler({
    customId: ButtonIds.PlayMastermindEasy,
    identifiers: [ButtonIds.PlayMastermindHard]
}).setRun(async ({ button, message }) => {
    const rows = button.customId === ButtonIds.PlayMastermindEasy ? 4 : 5;

    const Master = new Mastermind({
        rows,
        colors: rows === 4 ? 6 : 8,
        maxTries: 12,
        interaction: button,
        user: button.user,
        ephemeral: true
    });
    const components = [row(new ButtonBuilder(message.components[0].toJSON()).setDisabled(true))];
    message.edit({ components }).catch(log4js.trace);

    Master.onEnd(() => {
        const updatedComponents = [row(new ButtonBuilder(message.components[0].toJSON()).setDisabled(false))];
        message.edit({ components: updatedComponents }).catch(log4js.trace);
    });
});
