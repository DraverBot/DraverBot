import { AutocompleteListener } from 'amethystjs';
import { arrayfy, capitalize } from '../utils/toolbox';
import permissions from '../data/perms.json';

export default new AutocompleteListener({
    commandName: [{ commandName: 'role', optionName: 'permission' }],
    listenerName: 'rolePermission',
    run: ({ focusedValue }) => {
        const perms = arrayfy<string>(permissions.role).filter(
            (x) =>
                x.toLowerCase().includes(focusedValue.toLowerCase()) ||
                focusedValue.toLowerCase().includes(x.toLowerCase())
        );

        const result = (perms.length === 0 ? arrayfy<string>(permissions.role) : perms).splice(0, 24).map((x) => ({
            name: capitalize(x),
            value: Object.keys(permissions.role).find((k) => permissions.role[k] === x)
        }));
        return result;
    }
});
