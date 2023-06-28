import { Process } from '../structures/Process';

export default new Process('get code point', (content: string) => {
    return content.codePointAt(0).toString(16);
});
