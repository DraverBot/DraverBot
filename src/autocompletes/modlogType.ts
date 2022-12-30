import { AutocompleteListener } from 'amethystjs';
import { modActionType } from '../typings/database';
import { capitalize } from '../utils/toolbox';

export default new AutocompleteListener({
    commandName: [{ commandName: 'modlogs' }],
    listenerName: 'modlogstype',
    run: async ({ focusedValue }) => {
        const types = modActionType;
        const typesArray = [];

        Object.keys(types).forEach((type) => {
            typesArray.push({
                name: capitalize(modActionType[type]),
                value: type
            });
        });

        return typesArray
            .filter(
                (x) =>
                    focusedValue.toLowerCase().includes(x.name) ||
                    x.name.toLowerCase().includes(focusedValue.toLowerCase())
            )
            .splice(0, 24);
    }
});
