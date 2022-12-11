import { Precondition } from 'amethystjs';

export default new Precondition('secret').setMessageRun(({ message }) => {
    if (message.deletable) message.delete().catch(() => {});
    return {
        ok: true,
        isChatInput: false,
        channelMessage: message
    };
});
