import { Precondition } from "amethystjs";
import ms from "ms";
import replies from "../data/replies";
import { GuildMember } from "discord.js";

export default new Precondition('validTime').setChatInputRun(({ interaction, options }) => {
    const time = options.getString('temps') || options.getString('durée');
    if (!time) return {
        ok: true,
        isChatInput: true,
        interaction
    }
    if (!ms(time)) {
        interaction.reply({
            embeds: [ replies.invalidTime(interaction?.member as GuildMember ?? interaction.user) ],
            ephemeral: true
        }).catch(() => {});
        return {
            ok: false,
            isChatInput: true,
            interaction,
            metadata: {
                silent: true
            }
        }
    }
    return {
        ok: true,
        isChatInput: true,
        interaction
    };
})