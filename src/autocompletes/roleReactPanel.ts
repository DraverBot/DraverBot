import { rolesReact } from '../cache/managers';
import { AutocompleteListener } from 'amethystjs';
import { resizeString } from '../utils/toolbox';

export default new AutocompleteListener({
    listenerName: 'role react panels',
    commandName: [{ commandName: 'autorole', optionName: 'panneau' }],
    run: ({ focusedValue, interaction }) => {
        return rolesReact
            .getList(interaction.guild?.id)
            .filter(
                (x) =>
                    x.title.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.title.toLowerCase())
            )
            .map((x) => ({ name: resizeString({ str: x.title, length: 100 }), value: x.id }))
            .splice(0, 25);
    }
});
