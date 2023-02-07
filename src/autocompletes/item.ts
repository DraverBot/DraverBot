import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    commandName: [
        { commandName: 'adminmagasin', optionName: 'item' },
        { commandName: 'magasin', optionName: 'item' }
    ],
    listenerName: 'item',
    run: ({ focusedValue, interaction }) => {
        const shop = interaction.client.shop.getShop(interaction.guild.id);

        return shop
            .filter(
                (x) =>
                    x.itemName.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.itemName.toLowerCase())
            )
            .splice(0, 24)
            .map((x) => ({
                name: `${x.itemName} - ${x.itemType === 'item' ? 'objet' : x.itemType === 'role' ? 'rôle' : 'inconnu'}`,
                value: x.id.toString()
            }));
    }
});
