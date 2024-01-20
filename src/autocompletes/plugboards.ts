import { plugboardsManager } from '../cache/managers';
import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    commandName: [
        { commandName: 'énigma', optionName: 'branchements' },
        { commandName: 'énigma', optionName: 'tableau' }
    ],
    listenerName: 'énigma plugboards',
    run: ({ focusedValue, interaction }) => {
        const boards = plugboardsManager.getUserPlugs(interaction.user.id);

        return boards
            .filter(
                (x) =>
                    x.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.name.toLowerCase())
            )
            .map((x) => ({ name: x.name, value: x.id.toString() }))
            .splice(0, 24);
    }
});
