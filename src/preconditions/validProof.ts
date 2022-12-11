import { Precondition } from 'amethystjs';
import { util } from '../utils/functions';

export default new Precondition('validProof').setChatInputRun(({ interaction, options }) => {
    const proof = options.getAttachment(util('proofName'), false);
    const ok = {
        ok: true,
        isChatInput: true,
        interaction
    };
    if (!proof) return ok;

    if (!proof.contentType.includes('image'))
        return {
            ok: false,
            isChatInput: true,
            interaction,
            metadata: {
                replyKey: 'invalidProofType',
                guild: interaction?.guild
            }
        };
    return ok;
});
