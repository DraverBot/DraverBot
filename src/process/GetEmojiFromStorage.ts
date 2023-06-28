import { Process } from '../structures/Process';
import GetEmojiFromCodePoint from './GetEmojiFromCodePoint';

export default new Process('get emoji from emoji storage', (content: string) => {
    if (/^[0-9A-Fa-f]{4,5}$/.test(content)) {
        return GetEmojiFromCodePoint.process(content);
    } else {
        return content;
    }
});
