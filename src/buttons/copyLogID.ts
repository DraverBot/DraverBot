import { ButtonHandler } from 'amethystjs';
import { translator } from '../translate/translate';

export default new ButtonHandler({
    customId: 'copyLogID'
}).setRun(({ message, button }) => {
    const id = message.embeds[0].fields.find((x) => x.name === 'Identifiant').value;

    button
        .reply({
            content: translator.translate('extern.buttons.logs.copyLogId', button, { id }),
            ephemeral: true
        })
        .catch(() => {});
});
