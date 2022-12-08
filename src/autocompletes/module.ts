import { AutocompleteListener } from 'amethystjs';
import { modulesData } from '../data/modulesData';
import { moduleType } from '../typings/database';
import { compareTwoStrings } from 'string-similarity';

export default new AutocompleteListener({
    commandName: [{ commandName: 'module' }],
    run: ({ focusedValue }) => {
        const list = Object.keys(modulesData)
            .map((key: moduleType) => modulesData[key])
            .filter((x) => x.editable === true);
        let filtered = list.filter((x) => compareTwoStrings(x.name, focusedValue)) as typeof list;

        if (filtered.length === 0) filtered = list;

        return filtered.map((x) => ({
            name: x.name,
            value: Object.keys(modulesData).find((y: moduleType) => modulesData[y].name === x.name)
        }));
    }
});
