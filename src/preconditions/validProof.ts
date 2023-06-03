import { Precondition } from 'amethystjs';
import { util } from '../utils/functions';
import { preconditionType } from 'amethystjs/dist/typings/Precondition';

export default new Precondition('validProof').setChatInputRun(({ interaction, options }) => {
    const proof = options.getAttachment(util('proofName'), false);
    const ok = {
        ok: true,
        type: 'chatInput' as preconditionType,
        interaction
    };
    if (!proof) return ok;

    if (!proof.contentType.includes('image'))
        return {
            ok: false,
            type: 'chatInput',
            interaction,
            metadata: {
                replyKey: 'invalidProofType',
                guild: interaction?.guild
            }
        };
    return ok;
});
