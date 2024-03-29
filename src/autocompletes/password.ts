import { passwords } from '../cache/managers';
import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    listenerName: 'password',
    commandName: [{ commandName: 'password' }],
    run: ({ interaction, focusedValue }) => {
        return passwords
            .getPasswords(interaction.user.id)
            .filter(
                (x) =>
                    x.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.name.toLowerCase())
            )
            .splice(0, 24)
            .map((x) => ({ name: x.name, value: x.name }));
    }
});
