import {
    ActionRowBuilder,
    AnyComponentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
    CommandInteraction,
    ComponentType,
    EmbedBuilder,
    Guild,
    InteractionReplyOptions,
    User
} from 'discord.js';
import replies, { replyKey } from '../data/replies';
import { Paginator } from '../managers/paginator';
import { addModLog as addModLogType, checkPermsOptions, paginatorOptions, randomType } from '../typings/functions';
import { util } from './functions';
import query from './query';

export const basicEmbed = (user: User, options?: { defaultColor: boolean }) => {
    const x = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ forceStatic: false }) });
    if (options?.defaultColor) x.setColor(util<ColorResolvable>('accentColor'));

    return x;
};
export const capitalize = (str: string) => {
    if (str.length < 1) return str;
    if (str.length === 1) return str.toUpperCase();
    return str[0].toUpperCase() + str.slice(1);
};
export const random = ({ max = 100, min = 0 }: randomType): number => {
    if (max < min) {
        const oldMax = max;
        max = min;
        min = oldMax;
    }

    return Math.floor(Math.random() * max - min) + min;
};
export const systemReply = (interaction: CommandInteraction, content: InteractionReplyOptions) => {
    const fnt = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
    return interaction[fnt](content);
};
export const boolDb = (bool: boolean): '0' | '1' => bool ? '0' : '1';
export const dbBool = (str: string) => str === '0' ? true : false;
export const addModLog = ({ guild, reason, mod_id, member_id, type, proof = '' }: addModLogType): Promise<boolean> => {
    return new Promise(async (resolve) => {
        const self = mod_id === guild.client.user.id ? '1' : '0';
        
        const rs = await query(
            `INSERT INTO modlogs ( guild_id, mod_id, member_id, date, type, reason, proof, autoMod, deleted, edited ) VALUES ( "${
                guild.id
            }", "${mod_id}", "${member_id}", "${Date.now()}", "${type}", "${sqliseString(reason)}", "${proof}", "${self}", "1", "1" )`
        );

        if (!rs) return resolve(false);
        resolve(true);
    });
};

export const evokerColor = (guild?: Guild) => {
    if (guild && guild.members?.me?.nickname === 'Evoker') return '#0000ff';
    return '#ff0000';
};
export const buildButton = ({ disabled = false, ...data }: {
    label?: string;
    url?: string;
    style: keyof typeof ButtonStyle;
    id?: string;
    disabled?: boolean;
    emoji?: string;
}) => {
    const componentData: any = {
        style: ButtonStyle[data.style],
        type: ComponentType.Button,
        disabled
    };

    if (data.label) componentData.label = data.label;
    if (data.emoji) componentData.emoji = data.emoji;
    if (data.url && !data.id) componentData.url = data.url;
    if (data.id && !data.url) componentData.custom_id = data.id;

    return new ButtonBuilder(componentData);
};
export const row = <T extends AnyComponentBuilder = ButtonBuilder>(...components: T[]) => {
    return new ActionRowBuilder({
        components
    }) as ActionRowBuilder<T>;
};
export const boolEmoji = (b: boolean) => (b ? '✅' : '❌');

export const checkPerms = ({ member, mod, checkBot = false, checkClientPosition = true, checkModPosition = true, checkOwner = true, ownerByPass = false, checkSelf, sendErrorMessage = false, interaction = undefined }: checkPermsOptions) => {
    const send = (key: replyKey): false => {
        if (sendErrorMessage === true && interaction) {
            systemReply(interaction, {
                embeds: [ (replies[key] as (user: User, metadata: any) => EmbedBuilder)(interaction.user, { member }) ],
                components: []
            }).catch(() => {});
        }
        return false;
    }

    const modOwner = mod.id === mod.guild.ownerId;

    if (ownerByPass === true && modOwner) return true;
    if (checkBot && member.user.bot) return send('memberBot');
    if (checkSelf && member.id === mod.id) return send('selfMod');
    if (checkModPosition && !modOwner && member.roles.highest.position >= mod.roles.highest.position) return send('memberTooHigh');
    if (checkClientPosition && member.roles.highest.position >= member.guild.members.me.roles.highest.position) return send('memberTooHighClient');
    if (checkOwner && member.id === member.guild.ownerId && !modOwner) return send('memberOwner');
    return true;
}
export const paginator = ({ interaction, user, embeds, time = 120000 }: paginatorOptions): Paginator => {
    return new Paginator({
        interaction,
        user,
        embeds,
        time
    });
}
export const numerize = (int: number) => int.toLocaleString('fr');
export const mapEmbedsPaginator = (embeds: EmbedBuilder[]) => {
    return embeds.map((x, i) => x.setFooter({ text: `Page ${numerize(i + 1)}/${numerize(embeds.length)}`, iconURL: x.data.footer?.icon_url ?? null }))
}
export const displayDate = (date: number) => {
    const x = Math.floor(date / 1000);

    return `<t:${x}:R> ( <t:${x}:F> )`;
}
export const sqliseString = (str: string) => str.replace(/"/g, '\\"');
