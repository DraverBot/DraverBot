import { waitForInteraction } from 'amethystjs';
import {
    ActionRowBuilder,
    AnyComponentBuilder,
    Attachment,
    BaseChannel,
    BaseInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CategoryChannel,
    ChannelType,
    Client,
    ColorResolvable,
    CommandInteraction,
    CommandInteractionOptionResolver,
    ComponentType,
    EmbedBuilder,
    EmbedField,
    Guild,
    GuildMember,
    InteractionReplyOptions,
    Message,
    Role,
    TextChannel,
    User
} from 'discord.js';
import { yesNoRow } from '../data/buttons';
import replies, { anyUser, replyKey } from '../data/replies';
import { Paginator } from '../managers/Paginator';
import {
    addModLog as addModLogType,
    checkPermsOptions,
    confirmReturn,
    paginatorOptions,
    randomType,
    sendLogOpts,
    updateLogOptions
} from '../typings/functions';
import { getModEmbedColor, util } from './functions';
import query from './query';
import time from '../maps/time';
import { modActionType } from '../typings/database';

export const basicEmbed = (user: User, options?: { defaultColor?: boolean; questionMark?: boolean }) => {
    const x = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ forceStatic: false }) });
    if (options?.defaultColor) x.setColor(util<ColorResolvable>('accentColor'));
    if (options?.questionMark) x.setColor('Grey');

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

    return Math.floor(Math.random() * (max - min)) + min;
};
export const systemReply = (interaction: CommandInteraction, content: InteractionReplyOptions) => {
    const fnt = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
    return interaction[fnt](content);
};
export const boolDb = (bool: boolean): '0' | '1' => (bool ? '1' : '0');
export const dbBool = (str: string | number) => ['1', 1].includes(str);
export const sendLog = async ({ guild, mod_id, member_id, reason, action, proof = undefined }: sendLogOpts) => {
    const activated = dbBool(guild.client.configsManager.getValue(guild.id, 'logs_enable')) as boolean;
    if (!activated) return false;

    const embed = new EmbedBuilder()
        .setTitle(capitalize(modActionType[action]))
        .setDescription(
            `Par <@${mod_id}> ( \`${mod_id}\` )${
                member_id
                    ? member_id?.length > 0 && member_id !== 'none'
                        ? ` sur <@${member_id}> ( \`${member_id}\` )`
                        : ''
                    : ''
            }\n> ${displayDate(Date.now())}`
        )
        .setFields({
            name: 'Raison',
            value: reason ?? 'Pas de raison',
            inline: false
        })
        .setColor(getModEmbedColor(action))
        .setFooter({
            text: guild.name,
            iconURL: guild.iconURL({ forceStatic: false }) ?? guild.client.user.displayAvatarURL()
        });
    if (proof) embed.setImage(proof);

    const channel = guild.channels.cache.get(
        guild.client.configsManager.getValue(guild.id, 'logs_channel')
    ) as TextChannel;
    if (!channel) return false;

    const res = await channel
        .send({
            embeds: [embed]
        })
        .catch(() => {});

    if (!res) return false;
    return true;
};
export const addModLog = ({ guild, reason, mod_id, member_id, type, proof = '' }: addModLogType): Promise<boolean> => {
    return new Promise(async (resolve) => {
        const self = mod_id === guild.client.user.id ? '0' : '1';

        const rs = await query(
            `INSERT INTO modlogs ( guild_id, mod_id, member_id, date, type, reason, proof, autoMod, deleted, edited ) VALUES ( "${
                guild.id
            }", "${mod_id}", "${member_id}", "${Date.now()}", "${type}", "${sqliseString(
                reason
            )}", "${proof}", "${self}", "${boolDb(false)}", "${boolDb(false)}" )`
        );

        const result = await sendLog({ guild, reason, member_id, action: type, proof, mod_id }).catch(() => {});

        if (!rs || !result) return resolve(false);
        resolve(true);
    });
};

export const evokerColor = (guild?: Guild) => {
    if (guild && guild.members?.me?.nickname === 'Evoker') return '#0000ff';
    return '#ff0000';
};
export const buildButton = ({
    disabled = false,
    ...data
}: {
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

export const checkPerms = ({
    member,
    mod,
    checkBot = false,
    checkClientPosition = true,
    checkModPosition = true,
    checkOwner = true,
    ownerByPass = false,
    checkSelf,
    sendErrorMessage = false,
    interaction = undefined
}: checkPermsOptions) => {
    const send = (key: replyKey): false => {
        if (sendErrorMessage === true && interaction) {
            systemReply(interaction, {
                embeds: [(replies[key] as (user: User, metadata: any) => EmbedBuilder)(interaction.user, { member })],
                components: []
            }).catch(() => {});
        }
        return false;
    };

    const modOwner = mod.id === mod.guild.ownerId;

    if (ownerByPass === true && modOwner) return true;
    if (checkBot && member.user.bot) return send('memberBot');
    if (checkSelf && member.id === mod.id) return send('selfMod');
    if (checkModPosition && !modOwner && member.roles.highest.position >= mod.roles.highest.position)
        return send('memberTooHigh');
    if (checkClientPosition && member.roles.highest.position >= member.guild.members.me.roles.highest.position)
        return send('memberTooHighClient');
    if (checkOwner && member.id === member.guild.ownerId && !modOwner) return send('memberOwner');
    return true;
};
export const pagination = ({ interaction, user, embeds, time = 120000 }: paginatorOptions): Paginator => {
    return new Paginator({
        interaction,
        user,
        embeds,
        time
    });
};
export const numerize = (int: number) => int.toLocaleString('fr');
export const mapEmbedsPaginator = (embeds: EmbedBuilder[]) => {
    return embeds.map((x, i) =>
        x.setFooter({
            text: `Page ${numerize(i + 1)}/${numerize(embeds.length)}`,
            iconURL: x.data.footer?.icon_url ?? null
        })
    );
};
export const displayDate = (date?: number) => {
    const x = Math.floor((date ?? Date.now()) / 1000);

    return `<t:${x}:R> ( <t:${x}:F> )`;
};
export const sqliseString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.replace(/"/g, '\\"').replace(/;/g, '\\;');
};
export const updateLog = ({ case_id, reason, proofURL }: updateLogOptions): Promise<boolean> => {
    return new Promise(async (resolve) => {
        const res = await query(
            `UPDATE modlogs SET edited='${boolDb(true)}', lastEditedTimestamp="${Date.now()}"${
                reason ? `, reason="${sqliseString(reason)}"` : ''
            }${proofURL ? `, proof="${proofURL}"` : ''} WHERE case_id='${case_id}'`
        ).catch(() => {});

        return resolve(res ? true : false);
    });
};
export const pingChan = (channel: BaseChannel | string) => {
    if (channel instanceof BaseChannel) {
        if (channel.type === ChannelType.GuildCategory) return (channel as CategoryChannel).name;
        return `<#${channel.id}>`;
    } else {
        return `<#${channel}>`;
    }
};
export const subcmd = (options: CommandInteractionOptionResolver) => {
    return options.getSubcommand();
};
export const confirm = ({
    interaction,
    user,
    embed,
    time = 120000,
    components = [yesNoRow()],
    ephemeral = false
}: {
    interaction: CommandInteraction | ButtonInteraction;
    user: User;
    embed: EmbedBuilder;
    time?: number;
    components?: ActionRowBuilder<ButtonBuilder>[];
    ephemeral?: boolean;
}): Promise<confirmReturn> => {
    return new Promise(async (resolve) => {
        let msg: Message<true>;

        setAsQuestion(embed);
        if (interaction.replied || interaction.deferred) {
            interaction
                .editReply({
                    embeds: [embed],
                    components: components as ActionRowBuilder<ButtonBuilder>[]
                })
                .catch(() => {});
            msg = (await interaction.fetchReply().catch(() => {})) as Message<true>;
        } else {
            msg = (await interaction
                .reply({
                    embeds: [embed],
                    fetchReply: true,
                    components: components as ActionRowBuilder<ButtonBuilder>[],
                    ephemeral
                })
                .catch(() => {})) as Message<true>;
        }

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user,
            message: msg,
            time,
            replies: waitForReplies(interaction.client)
        }).catch(() => {});

        if (!reply) return resolve('cancel');
        return resolve({
            value: reply.customId === 'yes',
            interaction: reply
        });
    });
};
export const setAsQuestion = (embed: EmbedBuilder) => {
    return embed.setColor('Grey');
};
export const plurial = (num: number, opts?: { singular?: string; plurial?: string }) => {
    const singular = opts?.singular ?? '';
    const plurial = opts?.plurial ?? 's';

    return num === 1 ? singular : plurial;
};
export const checkCtx = (interaction: BaseInteraction, user: User) => {
    if (interaction.user.id !== user.id) {
        if (interaction.isRepliable()) {
            interaction
                .reply({
                    ephemeral: true,
                    embeds: [replies.replyNotAllowed((interaction?.member as GuildMember) ?? interaction.user)]
                })
                .catch(() => {});
        }
        return false;
    }
    return true;
};
export const inviteLink = (client: Client) => {
    return `https://discord.com/api/oauth2/authorize?client_id=${client.application.id}&permissions=1633107176695&scope=bot%20applications.commands`;
};
export const pingUser = (user: anyUser | string) => {
    if (user instanceof User || user instanceof GuildMember) return `<@${user.id}>`;
    return `<@${user}>`;
};
export const notNull = (variable: any) => ![undefined, null].includes(variable);
export const resizeString = ({ str, length = 200 }: { str: string; length?: number }) => {
    if (str.length <= length) return str;

    return str.substring(0, length - 3) + '...';
};
export const arrayfy = (obj: object) => {
    return Object.keys(obj).map((x) => obj[x]);
};
export const sqlToObj = (obj: object) => {
    const data = obj;
    Object.keys(data)
        .filter((k) => typeof data[k] !== 'boolean' && data[k].length === 1)
        .forEach((k) => {
            data[k] = dbBool(k);
        });

    return data;
};
export const nickname = (user: anyUser): string => {
    if (user instanceof User) return user.username;
    return user?.nickname ?? user.user.username;
};
export const waitForReplies = (client: Client) => {
    return {
        everyone: {
            embeds: [replies.replyNotAllowed(client.user)],
            ephemeral: true
        },
        user: {
            embeds: [replies.replyNotAllowed(client.user)],
            ephemeral: true
        }
    };
};
export const pingRole = (role: Role | string) => {
    if (role instanceof Role) return `<@&${role.id}>`;
    return `<@&${role}>`;
};
export const getMsgUrl = ({
    guild_id,
    channel_id,
    message_id
}: {
    guild_id: string;
    channel_id: string;
    message_id: string;
}) => {
    return `https://discord.com/channels/${guild_id}/${channel_id}/${message_id}`;
};
export const addTimeDoc = (userId: string) => {
    const value = time.get(userId) ?? 0;
    time.set(userId, value + 1);

    if (value >= 3)
        return `\n\nPour afficher un temps correct, utilisez un nombre suivit du temps que vous voulez.\nUtilisez \`s\` pour les secondes, \`m\` pour les minutes, \`h\` pour les heures et \`d\` pour les jours`;
    return '';
};
export const hint = (text: string) =>
    `\n:bulb:\n> ${text.replace(/serveur {0,}de {0,}support/g, `[serveur de support](${util('support')})`)}`;
export const codeBox = (text: string, type = 'txt') => `\`\`\`${type}\n${text}\`\`\``;
export const addProof = (embed: EmbedBuilder, proof?: Attachment | undefined) => {
    if (proof && proof?.url) embed.setImage(proof.url);
    return embed;
};
export const modFields = ({
    mod,
    member,
    reason
}: {
    mod: anyUser | string;
    member: anyUser | string;
    reason: string;
}) => {
    const getId = (user: anyUser | string) => {
        if (user instanceof User || user instanceof GuildMember) return user.id;
        return user;
    };
    return [
        {
            name: 'Modérateur',
            value: `${pingUser(mod)} ( \`${getId(mod)}\` )`,
            inline: true
        },
        {
            name: 'Membre',
            value: `${pingUser(member)} ( \`${getId(member)}\` )`,
            inline: true
        },
        {
            name: 'Raison',
            value: reason,
            inline: false
        }
    ] as EmbedField[];
};
export const secondsToDays = (time: number) => {
    let seconds = 0;
    let minutes = 0;
    let hours = 0;
    let days = 0;

    for (let i = 0; i < time; i++) {
        seconds++;
        if (seconds === 60) {
            seconds = 0;
            minutes++;
        }
        if (minutes === 60) {
            hours++;
            minutes = 0;
        }
        if (hours === 24) {
            hours = 0;
            days++;
        }
    }

    const superior = [
        { name: 'seconde', value: seconds },
        { name: 'minute', value: minutes },
        { name: 'heure', value: hours },
        { name: 'jour', value: days }
    ]
        .filter((x) => x.value > 0)
        .reverse();

    const format = [];
    superior.forEach((sup) => {
        format.push(`${numerize(sup.value)} ${sup.name}${plurial(sup.value)}`);
    });
    let str = '';

    format.forEach((v, i, a) => {
        str += v + (a[i + 1] ? (a[i + 2] ? ', ' : ' et ') : '');
    });
    return str;
};
