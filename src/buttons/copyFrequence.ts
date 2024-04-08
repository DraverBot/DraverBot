import { interserver } from '../cache/managers';
import { ButtonHandler } from 'amethystjs';
import { translator } from '../translate/translate';

export default new ButtonHandler({
    customId: 'interchat.see-frequence',
    permissions: ['Administrator']
}).setRun(({ message, button }) => {
    const frequence =
        interserver.cache.get(message.embeds[0].description.split('<#')[1].split('>')[0])?.frequence ?? 'missingno';

    button.reply({
        content: translator.translate('extern.buttons.interchat.copyFrequence', button, { frequence }),
        ephemeral: true
    });
});
