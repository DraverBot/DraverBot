import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import { Mastermind } from '../structures/Mastermind';
import { basicEmbed, buildButton, row } from '../utils/toolbox';
import masterminds from '../maps/masterminds';
import { translator } from '../translate/translate';

export default new ButtonHandler({
    customId: ButtonIds.PlayMastermindEasy,
    identifiers: [ButtonIds.PlayMastermindHard]
}).setRun(async ({ button, user }) => {
    if (masterminds.has(user.id))
        return button
            .reply({
                embeds: [
                    basicEmbed(user, { evoker: button.guild })
                        .setTitle(translator.translate('fun.games.mastermind.running.title', button))
                        .setDescription(translator.translate('fun.games.mastermind.running.description', button))
                ],
                ephemeral: true,
                components: [
                    row(
                        buildButton({
                            label: translator.translate('fun.games.mastermind.resign.label', button),
                            style: 'Danger',
                            buttonId: 'ResignToCurrentMastermind'
                        })
                    )
                ]
            })
            .catch(log4js.trace);
    const rows = button.customId === ButtonIds.PlayMastermindEasy ? 4 : 5;

    const Master = new Mastermind({
        rows,
        colors: rows === 4 ? 6 : 8,
        maxTries: 12,
        interaction: button,
        user: button.user,
        ephemeral: true
    });
    masterminds.set(user.id, Master);
    Master.onEnd(() => {
        masterminds.delete(user.id);
    });
});
