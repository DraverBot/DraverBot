import { Precondition } from 'amethystjs';
import { GuildMember } from 'discord.js';
import { checkPerms } from '../utils/toolbox';
import { preconditionType } from 'amethystjs/dist/typings/Precondition';

export default new Precondition('economyPermCheck').setChatInputRun(({ interaction, options }) => {
    const member = options.getMember('membre') ?? options.getMember('utilisateur');

    const ok = {
        ok: true,
        interaction,
        type: 'chatInput' as preconditionType
    };
    if (!member) return ok;
    if (
        !checkPerms({
            member: member as GuildMember,
            mod: interaction.member as GuildMember,
            checkModPosition: true,
            checkOwner: true,
            checkBot: true,
            sendErrorMessage: true,
            checkClientPosition: false,
            interaction
        })
    )
        return {
            ok: false,
            isChatInput: true,
            interaction,
            metadata: {
                silent: true
            },
            type: 'chatInput'
        };
    return ok;
});
