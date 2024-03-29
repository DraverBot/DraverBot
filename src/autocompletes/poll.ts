import { pollsManager } from '../cache/managers';
import { AutocompleteListener } from 'amethystjs';
import { resizeString } from '../utils/toolbox';

export default new AutocompleteListener({
    commandName: [{ commandName: 'sondage', optionName: 'sondage' }],
    listenerName: 'poll',
    run: ({ interaction, focusedValue }) => {
        const list = pollsManager.getPollsList(interaction.guild?.id).filter((x) => x.ended === false);

        return list
            .filter(
                (x) =>
                    x.data.question.toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(x.data.question.toLowerCase())
            )
            .map((x) => ({ name: resizeString({ str: x.data.question, length: 100 }), value: x.data.poll_id }))
            .slice(0, 24);
    }
});
