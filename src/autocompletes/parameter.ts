import { AutocompleteListener } from 'amethystjs';
import { configKeys, configsData } from '../data/configData';
import { capitalize } from '../utils/toolbox';

export default new AutocompleteListener({
    listenerName: 'paramètre',
    commandName: [{ commandName: 'configurer', optionName: 'paramètre' }],
    run: ({ focusedValue }) => {
        const parameters = Object.keys(configsData).map((x: keyof configKeys) => configsData[x]);

        return parameters
            .filter(
                (x) =>
                    x.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.name.toLowerCase()) ||
                    x.description.includes(focusedValue.toLowerCase())
            )
            .map((x) => ({ name: capitalize(x.name), value: x.value }))
            .splice(0, 25);
    }
});
