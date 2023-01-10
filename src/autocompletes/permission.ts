import { AutocompleteListener } from 'amethystjs';
import { arrayfy, capitalize } from '../utils/toolbox';
import permissions from '../data/perms.json';

export default new AutocompleteListener({
    commandName: [{ commandName: 'salon', optionName: 'permission' }],
    listenerName: 'permission',
    run: ({ focusedValue }) => {
        const perms = arrayfy<string>(permissions);

        const result = perms
            .filter(
                (x) =>
                    x.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.toLowerCase())
            )
            .splice(0, 24)
            .map((x) => ({
                name: capitalize(x),
                value: Object.keys(permissions).find((k) => permissions[k] === x)
            }));
        return result;
    }
});
