import { rewards } from '../cache/managers';
import { AutocompleteListener } from 'amethystjs';
import { levelReward } from '../typings/managers';
import { levelRewardType } from '../typings/database';
import { resizeString } from '../utils/toolbox';
import { translator } from '../translate/translate';

export default new AutocompleteListener({
    commandName: [{ commandName: 'récompenses', optionName: 'récompense' }],
    listenerName: 'Rewards',
    run: ({ interaction, focusedValue }) => {
        const name = (x: levelReward<levelRewardType>) => {
            const type = translator.translate(`extern.autocompletes.content.reward.types.${x.type}`, interaction);

            return x.type === 'role'
                ? translator.translate('extern.autocompletes.content.reward.namingRole', interaction, {
                      level: x.level,
                      value: x.value,
                      type
                  })
                : translator.translate(`extern.autocompletes.content.reward.namingBasic`, interaction, {
                      level: x.level,
                      type
                  });
        };

        return rewards
            .getRewards(interaction)
            .filter(
                (x) =>
                    name(x).toLowerCase().includes(focusedValue.toLowerCase()) ||
                    focusedValue.toLowerCase().includes(name(x).toLowerCase())
            )
            .slice(0, 24)
            .map((x) => ({ name: resizeString({ str: name(x), length: 100 }), value: x.id.toString() }));
    }
});
