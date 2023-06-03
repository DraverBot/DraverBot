import { Precondition } from 'amethystjs';
import { util } from '../utils/functions';
import { sendError } from '../utils/toolbox';

export default new Precondition('dev')
    .setMessageRun(({ message }) => {
        if (message.author.id !== util('dev'))
            return {
                type: 'message',
                ok: false,
                channelMessage: message
            };
        return {
            type: 'message',
            ok: true,
            channelMessage: message
        };
    })
    .setButtonRun(({ button, user }) => {
        if (user.id !== util('dev')) {
            button.deferUpdate().catch(sendError);
            return {
                type: 'button',
                ok: false,
                button
            };
        }
        return {
            type: 'button',
            ok: true,
            button
        };
    });
