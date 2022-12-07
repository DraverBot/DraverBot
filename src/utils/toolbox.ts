import { CommandInteraction, EmbedBuilder, InteractionReplyOptions, User } from "discord.js";
import { randomType } from "../typings/functions";

export const basicEmbed = (user: User) => {
    return new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ forceStatic: false }) })
}
export const capitalize = (str: string) => {
    if (str.length < 1) return str;
    if (str.length === 1) return str.toUpperCase()
    return str[0].toUpperCase() + str.slice(1)
}
export const random = ({ max = 100, min = 0 }: randomType): number => {
    if (max < min) {
        const oldMax = max;
        max = min;
        min = oldMax;
    }

    return Math.floor(Math.random() * max - min) + min;
}
export const systemReply = (interaction: CommandInteraction, content: InteractionReplyOptions) => {
    const fnt = (interaction.replied || interaction.deferred) ? 'editReply' : 'reply';
    return interaction[fnt](content);
}