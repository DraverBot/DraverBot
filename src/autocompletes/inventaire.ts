import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    commandName: [{ commandName: 'magasin', optionName: 'objet' }],
    listenerName: 'inventaire',
    run: ({ focusedValue, interaction }) => {
        const inventory = interaction.client.shop.getInventory({
            user_id: interaction.user.id,
            guild_id: interaction.guild.id
        });

        return inventory
            .filter(
                (x) =>
                    x.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.name)
            )
            .splice(0, 24)
            .map((x) => ({ name: x.name, value: x.id }));
    }
});
