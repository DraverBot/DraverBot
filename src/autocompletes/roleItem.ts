import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    commandName: [{ commandName: 'inventaire', optionName: 'rôle' }],
    listenerName: 'role item',
    run: ({ interaction, focusedValue }) => {
        const inventory = interaction.client.shop.getInventory({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        });

        return inventory
            .filter(
                (x) =>
                    (x.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                        focusedValue.toLowerCase().includes(x.name)) &&
                    x.type === 'role'
            )
            .map((x) => ({ name: x.name, value: x.id.toString() }))
            .splice(0, 24);
    }
});
