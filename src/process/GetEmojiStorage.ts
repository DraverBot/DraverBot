import { Process } from '../structures/Process';
import GetCodePoint from './GetCodePoint';

export default new Process('get emoji storage', (content: string) => {
    if (/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(content)) {
        return GetCodePoint.process(content);
    } else {
        return content.toString();
    }
});
