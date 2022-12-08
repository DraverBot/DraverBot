import { Precondition } from "amethystjs";
import { GuildMember } from "discord.js";
import { checkPerms } from "../utils/toolbox";

export default new Precondition('modPermCheck').setChatInputRun(({ interaction, options }) => {
    const member = options.getMember('membre') ?? options.getMember('utilisateur');

    const ok = {
        ok: true,
        isChatInput: true,
        interaction
    };
    if (!member) return ok;
    if (!checkPerms({
        member: member as GuildMember,
        mod: interaction.member as GuildMember,
        checkClientPosition: true,
        checkModPosition: true,
        checkOwner: true,
        sendErrorMessage: true,
        interaction
    })) return {
        ok: false,
        isChatInput: true,
        interaction,
        metadata: {
            silent: true
        }
    }
    return ok;
})