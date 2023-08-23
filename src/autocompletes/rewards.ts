import { AutocompleteListener } from 'amethystjs';
import { levelReward } from '../typings/managers';
import { levelRewardType } from '../typings/database';
import { numerize, resizeString } from '../utils/toolbox';
import { util } from '../utils/functions';

export default new AutocompleteListener({
    commandName: [{ commandName: 'récompenses', optionName: 'récompense' }],
    listenerName: 'Rewards',
    run: ({ interaction, focusedValue, client }) => {
        const name = (x: levelReward<levelRewardType>) =>
            `Niveau ${x.level}${x.type === 'role' ? '' : `, ${numerize(x.value as number)} ${util('coins')}`} - ${
                x.type === 'coins' ? util('coins') : 'rôle'
            }`;
        const rewards = client.rewards
            .getRewards(interaction)
            .filter(
                (x) =>
                    name(x).toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(name(x).toLowerCase())
            );

        return rewards
            .slice(0, 24)
            .map((x) => ({ name: resizeString({ str: name(x), length: 100 }), value: x.id.toString() }));
    }
});
