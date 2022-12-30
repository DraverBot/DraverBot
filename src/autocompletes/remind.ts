import { AutocompleteListener } from 'amethystjs';
import { resizeString } from '../utils/toolbox';

export default new AutocompleteListener({
    commandName: [{ commandName: 'rappel', optionName: 'rappel' }],
    listenerName: 'rappel',
    run: ({ focusedValue, interaction }) => {
        const list = interaction.client.RemindsManager.getUserReminds(interaction.user.id)
            .toJSON()
            .filter(
                (x) =>
                    x.id.toString().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.id.toString())
            );
        return list.map((x) => ({ name: resizeString({ str: x.reason, length: 100 }), value: x.id.toString() }));
    }
});
