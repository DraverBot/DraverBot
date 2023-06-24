import { AutocompleteListener } from 'amethystjs';
import { resizeString } from '../utils/toolbox';

export default new AutocompleteListener({
    commandName: [{ commandName: 'tache' }],
    listenerName: 'task',
    run: ({ focusedValue, interaction }) => {
        const list = interaction.client.tasksManager.getServer(interaction.guild?.id);
        return list
            .filter(
                (x) =>
                    x.data.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.data.name.toLowerCase()) ||
                    x.data.description.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.data.description.toLowerCase())
            )
            .map((x) => ({
                name: resizeString({ str: x.data.name, length: 100 }),
                value: x.data.id.toString()
            }))
            .splice(0, 24);
    }
});
