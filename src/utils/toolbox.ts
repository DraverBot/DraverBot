import { ColorResolvable, CommandInteraction, EmbedBuilder, InteractionReplyOptions, User } from "discord.js";
import { addModLog as addModLogType, randomType } from "../typings/functions";
import { util } from "./functions";
import query from "./query";

export const basicEmbed = (user: User, options?: { defaultColor: boolean }) => {
    const x = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ forceStatic: false }) })
    if (options?.defaultColor) x.setColor(util<ColorResolvable>('accentColor'));
    
    return x
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
export const dbBool = (str: string) => str !== '0';
export const addModLog = ({ guild, reason, mod_id, member_id, type, proof = '' }: addModLogType): Promise<boolean> => {
    return new Promise(async(resolve) => {
        const self = mod_id === guild.client.user.id ? '1' : '0';
        reason = reason.replace(/"/g, '\\"');
    
        const rs = await query(`INSERT INTO modlogs ( guild_id, mod_id, member_id, date, type, reason, proof, autoMod, deleted, edited ) VALUES ( "${guild.id}", "${mod_id}", "${member_id}", "${Date.now()}", "${type}", "${reason}", "${proof}", "${self}", "0", "0" )`);

        if (!rs) return resolve(false)
        resolve(true)
    })
}