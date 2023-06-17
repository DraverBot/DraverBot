import { AutocompleteListener } from 'amethystjs';

export default new AutocompleteListener({
    commandName: [{ commandName: 'énigma', optionName: 'rotors' }],
    listenerName: 'rotors énigmas',
    run: ({ focusedValue }) => {
        function generateRotorCombinations(rotors: string[], combinationLength: number) {
            const combinations: string[] = [];

            function generatePermutations(rotors: string[], combinationLength: number, currentCombination: string[]) {
                if (currentCombination.length === combinationLength) {
                    combinations.push(currentCombination.join(' '));
                    return;
                }

                for (let i = 0; i < rotors.length; i++) {
                    if (!currentCombination.includes(rotors[i])) {
                        currentCombination.push(rotors[i]);
                        generatePermutations(rotors, combinationLength, currentCombination);
                        currentCombination.pop();
                    }
                }
            }

            generatePermutations(rotors, combinationLength, []);

            return combinations;
        }

        const elements = ['I', 'II', 'III', 'IV', 'V'];
        const combinations = generateRotorCombinations(elements, 3);

        const map = { I: 0, II: 1, III: 2, IV: 3, V: 4 };
        return combinations
            .filter(
                (x) =>
                    x.toLowerCase().includes(focusedValue.toLowerCase().replace(/ +/g, ' ')) ||
                    focusedValue.toLowerCase().replace(/ +/g, ' ').includes(x.toLowerCase())
            )
            .map((x) => ({
                name: x,
                value: x
                    .split(' ')
                    .map((y) => map[y].toString())
                    .join('')
            }))
            .splice(0, 24);
    }
});
