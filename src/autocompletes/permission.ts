import { AutocompleteListener } from 'amethystjs';
import { arrayfy, capitalize } from '../utils/toolbox';
import permissions from '../data/perms.json';
import { translator } from '../translate/translate';

export default new AutocompleteListener({
    commandName: [{ commandName: 'salon', optionName: 'permission' }],
    listenerName: 'channelPermission',
    run: ({ focusedValue, interaction }) => {
        const roles = Object.entries(permissions.channel).map(([k, v]) => [k, translator.translate(`contents.global.perms.channel.${v}`, interaction)])
        const perms = roles.filter(
            (x) =>
                x[1].toLowerCase().includes(focusedValue.toLowerCase()) ||
                focusedValue.toLowerCase().includes(x[1].toLowerCase())
        );

        const result = (perms.length === 0 ? roles : perms).splice(0, 24).map((x) => ({
            name: capitalize(x[1]),
            value: x[0]
        }));
        return result;
    }
});
