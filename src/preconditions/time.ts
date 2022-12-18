import { Precondition } from "amethystjs";
import ms from "ms";
import { addTimeDoc, basicEmbed, evokerColor } from "../utils/toolbox";

export default new Precondition('validTime').setChatInputRun(({ interaction, options }) => {
    const time = options.getString('temps') || options.getString('durée');
    if (!ms(time)) {
        interaction.reply({
            embeds: [ basicEmbed(interaction.user)
                .setColor(evokerColor(interaction?.guild ?? undefined))
                .setTitle("Temps invalide")
                .setDescription(`Vous n'avez pas saisi une durée valide${addTimeDoc(interaction.user.id)}`)
            ],
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