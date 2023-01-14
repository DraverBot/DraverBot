import { Precondition } from 'amethystjs';
import { util } from '../utils/functions';
import { sendError } from '../utils/toolbox';

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
            button.deferUpdate().catch(sendError);
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
