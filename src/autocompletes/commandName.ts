import { AutocompleteListener } from "amethystjs";

export default new AutocompleteListener({
    listenerName: 'commandName',
    commandName: [{ commandName: 'help' }],
    run: ({ interaction, focusedValue }) => {
        const commands = interaction.client.chatInputCommands.map(x => x.options);

        return commands.filter(x => x.name.includes(focusedValue.toLowerCase()) || focusedValue.toLowerCase().includes(x.name)).splice(0, 24).map((x) => ({ name: x.name, value: x.name }));
    }
})