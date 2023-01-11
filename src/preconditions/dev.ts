import { Precondition } from 'amethystjs';
import { util } from '../utils/functions';

export default new Precondition('dev')
    .setMessageRun(({ message }) => {
        if (message.author.id !== util('dev'))
            return {
                ok: false,
                isChatInput: false,
                channelMessage: message
            };
        return {
            ok: true,
            isChatInput: false,
            channelMessage: message
        };
    })
    .setButtonRun(({ button, user }) => {
        if (user.id !== util('dev')) {
            button.deferUpdate().catch(() => {});
            return {
                ok: false,
                isChatInput: false,
                button,
                isButton: true
            };
        }
        return {
            ok: true,
            isChatInput: false,
            button,
            isButton: true
        };
    });
