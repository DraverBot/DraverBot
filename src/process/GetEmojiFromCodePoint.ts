import { Process } from '../structures/Process';

export default new Process('get emoji from code point', (codePoint: string) => {
    return String.fromCodePoint(parseInt(codePoint, 16));
});
