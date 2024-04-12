import { AutocompleteListener } from 'amethystjs';
import { variablesGroupNames } from '../data/vars';
import { capitalize } from '../utils/toolbox';
import { translator } from '../translate/translate';

export default new AutocompleteListener({
    commandName: [{ commandName: 'configurer', optionName: 'variable' }],
    listenerName: 'variables',
    run: ({ focusedValue, interaction }) => {
        return variablesGroupNames
            .filter((x) => x.name.includes(focusedValue.toLowerCase()) || focusedValue.toLowerCase().includes(x.name))
            .map((x) => ({ name: capitalize(translator.translate(`contents.global.variables.groups.${x.id}`, interaction)), value: x.value }))
            .splice(0, 24);
    }
});
