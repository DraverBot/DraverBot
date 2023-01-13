import { AutocompleteListener } from 'amethystjs';
import { arrayfy, capitalize } from '../utils/toolbox';
import permissions from '../data/perms.json';

export default new AutocompleteListener({
    commandName: [{ commandName: 'salon', optionName: 'permission' }],
    listenerName: 'channelPermission',
    run: ({ focusedValue }) => {
        const perms = arrayfy<string>(permissions.channel).filter(
            (x) =>
                x.toLowerCase().includes(focusedValue.toLowerCase()) ||
                focusedValue.toLowerCase().includes(x.toLowerCase())
        );

        const result = (perms.length === 0 ? arrayfy<string>(permissions.channel) : perms).splice(0, 24).map((x) => ({
            name: capitalize(x),
            value: Object.keys(permissions.channel).find((k) => permissions.channel[k] === x)
        }));
        return result;
    }
});
