import { AutocompleteListener } from 'amethystjs';
import { variablesGroupNames } from '../data/vars';
import { capitalize } from '../utils/toolbox';

export default new AutocompleteListener({
    commandName: [{ commandName: 'configurer', optionName: 'variable' }],
    listenerName: 'variables',
    run: ({ focusedValue }) => {
        return variablesGroupNames
            .filter((x) => x.name.includes(focusedValue.toLowerCase()) || focusedValue.toLowerCase().includes(x.name))
            .map((x) => ({ name: capitalize(x.name), value: x.value }))
            .splice(0, 24);
    }
});
