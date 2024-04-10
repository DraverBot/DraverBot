/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    APIInteractionGuildMember,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
    Guild,
    GuildMember,
    PermissionsString,
    Role,
    TextChannel,
    User
} from 'discord.js';
import errors from '../maps/errors';
import { moduleType, tasks } from '../typings/database';
import { permType } from '../typings/functions';
import { getRolePerm, moduleName, util } from '../utils/functions';
import {
    addTimeDoc,
    anyHexColor,
    basicEmbed as basic,
    displayDate,
    evokerColor,
    notNull,
    numerize,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    random,
    resizeString
} from '../utils/toolbox';
import { inputLetters } from '../utils/ciphers';
import { color } from '../utils/functions';
import modules from '../maps/modules';
import { configKeys, configsData } from './configData';
import { langResolvable } from '../typings/core';
import { translator } from '../translate/translate';

export type anyUser = User | GuildMember;

const userMember = (user: anyUser, color?: ColorResolvable) => {
    const embed = basic(user instanceof User ? user : user.user).setColor(color ?? '#ff0000');
    if (user instanceof GuildMember) embed.setColor(evokerColor(user.guild));

    return embed;
};

const replies = {
    guildOnly: (user: User, metadata: { guild?: Guild; lang: langResolvable }) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.guildOnly.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.guildOnly.description', metadata.lang))
            .setColor(evokerColor(metadata.guild));
    },
    DMOnly: (user: User, metadata: { guild?: Guild; lang: langResolvable }) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.DMOnly.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.DMOnly.description', metadata.lang))
            .setColor(evokerColor(metadata.guild));
    },
    clientMissingPermissions: (
        user: User,
        metadata: { lang: langResolvable; permissions?: { missing: PermissionsString[] }; guild?: Guild }
    ) => {
        const { missing } = metadata.permissions;

        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.clientMissingPerms.title', metadata.lang))
            .setDescription(
                missing.length === 1
                    ? translator.translate('contents.global.embeds.clientMissingPerms.alone', metadata.lang, {
                          permission: translator.translate(`contents.global.perms.role.${missing}`, metadata.lang)
                      })
                    : translator.translate('contents.global.embeds.clientMissingPerms.multiple', metadata.lang, {
                          permissions: missing
                              .map(
                                  (permString) =>
                                      `\`${translator.translate(`contents.global.perms.role.${permString}`, metadata.lang)}\``
                              )
                              .join(' ')
                      })
            )
            .setColor(evokerColor(metadata.guild));
    },
    userMissingPermissions: (
        user: User,
        metadata: { permissions?: { missing: PermissionsString[] }; guild?: Guild; lang: langResolvable }
    ) => {
        const { missing } = metadata.permissions;

        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.userMissingPerms.title', metadata.lang))
            .setDescription(
                missing.length === 1
                    ? translator.translate('contents.global.embeds.userMissingPerms.alone', metadata.lang, {
                          permission: translator.translate(`contents.global.perms.role.${missing}`, metadata.lang)
                      })
                    : translator.translate('contents.global.embeds.userMissingPerms.multiple', metadata.lang, {
                          permissions: missing
                              .map(
                                  (permString) =>
                                      `\`${translator.translate(`contents.global.perms.role.${permString}`, metadata.lang)}\``
                              )
                              .join(' ')
                      })
            )
            .setColor(evokerColor(metadata.guild));
    },
    underCooldown: (user: User, metadata: { remainingCooldownTime?: number; guild?: Guild; lang: langResolvable }) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.underCooldown.title', metadata.lang))
            .setDescription(
                translator.translate('contents.global.embeds.underCooldown.description', metadata.lang, {
                    cooldown: Math.ceil(metadata.remainingCooldownTime / 1000)
                })
            )
            .setColor(evokerColor(metadata.guild));
    },
    moduleDisabled: (
        user: User,
        { guild, module, lang }: { guild: Guild; module: moduleType; lang: langResolvable }
    ) => {
        const embed = basic(user)
            .setTitle(translator.translate('contents.global.embeds.moduleDisabled.title', lang))
            .setColor(evokerColor(guild));

        const times = modules.get(user.id) ?? 0;
        const moduleText = translator.translate(`contents.global.modules.${module}`, lang);
        if (times >= 5) {
            embed.setDescription(
                translator.translate('contents.global.embeds.moduleDisabled.fullDescription', lang, {
                    module: moduleText
                })
            );
        } else {
            embed.setDescription(
                translator.translate('contents.global.embeds.moduleDisabled.description', lang, {
                    module: moduleText
                })
            );
        }
        modules.set(user.id, times + 1);
        return embed;
    },
    invalidProofType: (user: User, { guild, lang }: { guild: Guild; lang: langResolvable }) => {
        return basic(user)
            .setColor(evokerColor(guild))
            .setTitle(translator.translate('contents.global.embeds.invalidProof.title', lang))
            .setDescription(translator.translate('contents.global.embeds.invalidProof.description', lang));
    },
    cancel: (lang: langResolvable) => {
        return new EmbedBuilder()
            .setTitle(translator.translate('contents.global.embeds.canceled.title', lang))
            .setColor('Yellow');
    },
    mysqlError: (user: User, metadata: { guild?: Guild; lang: langResolvable }) => {
        const embed = basic(user)
            .setColor(evokerColor(metadata.guild))
            .setTitle(translator.translate('contents.global.embeds.mysqlError.title', metadata.lang));

        if (errors.has(user.id) && errors.get(user.id) > 3) {
            embed.setDescription(
                translator.translate('contents.global.embeds.mysqlError.fullDescription', metadata.lang)
            );
        } else {
            embed.setDescription(translator.translate('contents.global.embeds.mysqlError.description', metadata.lang));
        }

        errors.set(user.id, (errors.get(user.id) ?? 0) + 1);
        return embed;
    },
    memberOwner: (user: User, { member, lang }: { member: GuildMember; lang: langResolvable }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle(translator.translate('contents.global.embeds.memberOwner.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.memberOwner.description', lang, {
                    member: pingUser(member)
                })
            );
    },
    memberBot: (user: User, { member, lang }: { member: GuildMember; lang: langResolvable }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle(translator.translate('contents.global.embeds.memberBot.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.memberBot.description', lang, { member: pingUser(member) })
            );
    },
    memberTooHigh: (user: User, { member, lang }: { member: GuildMember; lang: langResolvable }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle(translator.translate('contents.global.embeds.memberTooHigh.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.memberTooHigh.description', lang, {
                    member: pingUser(member)
                })
            );
    },
    memberTooHighClient: (user: User, { member, lang }: { member: GuildMember; lang: langResolvable }) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.memberTooHighClient.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.memberTooHighClient.description', lang, {
                    member: pingUser(member)
                })
            )
            .setColor(evokerColor(member.guild));
    },
    notEnoughCoins: (user: GuildMember, target: anyUser = user, lang: langResolvable) => {
        return basic(user.user)
            .setTitle(translator.translate('contents.global.embeds.notEnoughCoins.title', lang))
            .setDescription(
                translator.translate(
                    `contents.global.embeds.notEnoughCoins.${target.id === user.id ? 'self' : 'other'}Description`,
                    lang,
                    {
                        user: pingUser(target)
                    }
                )
            )
            .setColor(evokerColor(user.guild));
    },
    selfMod: ({ user, guild }: GuildMember, metadata: { lang: langResolvable }) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.selfMod.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.selfMod.description', metadata.lang))
            .setColor(evokerColor(guild));
    },
    replyNotAllowed: (user: anyUser, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.replyNotAllowed.title', lang))
            .setDescription(translator.translate('contents.global.embeds.replyNotAllowed.description', lang));
    },
    unexistingLog: (user: anyUser, id: string, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.unexistingLog.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.unexistingLog.description', lang, { id: parseInt(id) })
            );
    },
    deletedLog: (user: anyUser, id: string, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.deletedLog.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.deletedLog.description', lang, { id: parseInt(id) })
            );
    },
    ownerOnly: (user: User, { guild, lang }: { guild: Guild; lang: langResolvable }) => {
        return basic(user)
            .setColor(evokerColor(guild))
            .setTitle(translator.translate('contents.global.embeds.ownerOnly.title', lang))
            .setDescription(translator.translate('contents.global.embeds.ownerOnly.description', lang));
    },
    interserverAlreadySet: (user: anyUser, metadata: { channel_id: string; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.interserverAlreadySet.title', metadata.lang))
            .setDescription(
                translator.translate('contents.global.embeds.interserverAlreadySet.description', metadata.lang, {
                    channel: pingChan(metadata.channel_id)
                })
            );
    },
    interserverUnexistingFrequence: (
        user: anyUser,
        { frequence, lang }: { frequence: string; lang: langResolvable }
    ) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.unexistingFrequence.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.unexistingFrequence.description', lang, { frequence })
            );
    },
    interserverFrequenceAssigned: (user: anyUser, { frequence, lang }: { frequence: string; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.frequenceAssigned.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.frequenceAssigned.description', lang, { frequence })
            );
    },
    interserverWebhookFailed: (user: anyUser, metadata: object & { lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.webhookFailed.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.webhookFailed.description', metadata.lang));
    },
    interserverNoFrequence: (user: anyUser, metadata: object & { lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.noFrequence.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.noFrequence.description', metadata.lang));
    },
    interserverNotChannel: (user: anyUser, metadata: { channel: TextChannel; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.interserverNotChannel.title', metadata.lang))
            .setDescription(
                translator.translate('contents.global.embeds.interserverNotChannel.description', metadata.lang, {
                    channel: pingChan(metadata.channel)
                })
            );
    },
    wait: (user: User, lang: langResolvable) => {
        return basic(user)
            .setTitle(translator.translate('contents.global.embeds.wait.title', lang))
            .setDescription(translator.translate('contents.global.embeds.wait.description', lang))
            .setColor('Orange');
    },
    invalidNumber: (user: anyUser, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidNumber.title', lang))
            .setDescription(translator.translate('contents.global.embeds.invalidNumber.description', lang));
    },
    invalidTime: (user: anyUser, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidTime.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.invalidTime.descriptoin', lang, {
                    timeDoc: addTimeDoc(user.id, lang)
                })
            );
    },
    invalidColor: (user: anyUser, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidColor.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.invalidColor.description', lang, {
                    colorOne: anyHexColor({ hashtagIncluded: false, type: 'long' }),
                    colorTwo: anyHexColor({ hashtagIncluded: true, type: 'long' }),
                    colorThree: anyHexColor({
                        type: 'short',
                        hashtagIncluded: true
                    })
                })
            );
    },
    loto: {
        noCurrentLoto: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.noLoto.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.noLoto.description', lang)),
        participationRegistered: (user: User, lang: langResolvable) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.participationRegistered.title', lang))
                .setDescription(
                    translator.translate('contents.global.embeds.loto.participationRegistered.description', lang)
                ),
        alreadyParticipate: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.alreadyParticipate.title', lang))
                .setDescription(
                    translator.translate('contents.global.embeds.loto.alreadyParticipate.description', lang)
                ),
        noParticipation: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.noParticipation.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.noParticipation.description', lang)),
        participationDeleted: (user: User, lang: langResolvable) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.participationDeleted.title', lang))
                .setDescription(
                    translator.translate('contents.global.embeds.loto.participationDeleted.description', lang)
                ),
        lotoDeleted: (user: User, lang: langResolvable) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.lotoDeleted.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.lotoDeleted.description', lang)),
        lotoStarted: (
            user: User,
            data: { coins: number; complementaries: number; numbers: number; endsAt: number; lang: langResolvable }
        ) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.started.title', data.lang))
                .setDescription(
                    translator.translate(
                        `contents.global.embeds.loto.started.description${data.coins > 0 ? 'Coins' : ''}`,
                        data.lang,
                        {
                            user: pingUser(user),
                            winnings: data.numbers,
                            complementaries: data.complementaries,
                            date: displayDate(data.endsAt),
                            prize: data.coins
                        }
                    )
                )
                .setTimestamp(data.endsAt),
        invalidParticipation: (
            user: User,
            guild: Guild,
            data: { numbers: number; complementaries: number; lang: langResolvable }
        ) => {
            const numbers: number[] = [];
            const complementaries: number[] = [];

            const available: number[] = [];
            for (let i = 1; i < 100; i++) {
                available.push(i);
            }

            for (let i = 0; i < data.numbers; i++) {
                const int = available[random({ max: available.length })];
                numbers.push(int);

                available.splice(available.indexOf(int), 1);
            }
            for (let i = 0; i < data.complementaries; i++) {
                const int = available[random({ max: available.length })];
                complementaries.push(int);

                available.splice(available.indexOf(int, 1));
            }
            return userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.invalidParticipation.title', data.lang))
                .setDescription(
                    translator.translate(
                        `contents.global.embeds.loto.invalidParticipation.description${data.complementaries > 0 ? 'Complementaries' : ''}`,
                        data.lang,
                        {
                            numbers: data.numbers,
                            complementaries: data.complementaries,
                            exampleNumbers: numbers.join(' '),
                            complementariesExample: complementaries.join(' ')
                        }
                    )
                );
        },
        lotoAlreadyStarted: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.alreadyStarted.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.alreadyStarted.description', lang)),
        lotoResult: (
            user: User,
            rolled: { numbers: number[]; complementaries: number[] },
            winners: {
                userId: string;
                numbers: number[];
                complementaries: number[];
                accuracy: number;
                reward: number;
            }[],
            lang: langResolvable
        ) => {
            if (winners.length == 0)
                return userMember(user, util<ColorResolvable>('accentColor'))
                    .setTitle(translator.translate('contents.global.embeds.loto.result.title', lang))
                    .setDescription(
                        translator.translate(
                            `contents.global.embeds.loto.result.noWinner${rolled.complementaries.length > 0 ? 'Complementaries' : ''}`,
                            lang,
                            {
                                rolled: rolled.numbers.join(' '),
                                complementaries: rolled.complementaries?.join?.(' ')
                            }
                        )
                    );
            return userMember(user, util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.result.title', lang))
                .setDescription(
                    translator.translate(
                        `contents.global.embeds.loto.result.winner${rolled.complementaries.length > 0 ? 'Complementaries' : ''}`,
                        lang,
                        {
                            rolled: rolled.numbers.join(' '),
                            complementariesRolled: rolled.complementaries?.join?.(' '),
                            winners: winners
                                .map((w) =>
                                    translator.translate('contents.global.embeds.loto.result.mapper', lang, {
                                        user: pingUser(w.userId),
                                        accuracy: w.accuracy * 100,
                                        reward: w.reward
                                    })
                                )
                                .join('\n')
                        }
                    )
                );
        }
    },
    internalError: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.internalError.title', lang))
            .setDescription(translator.translate('contents.global.embeds.internalError.description', lang)),
    pollEmbed: (
        user: User,
        question: string,
        endsAt: number,
        choices: { name: string; count: number; id?: number }[],
        lang: langResolvable
    ) =>
        userMember(user, util<ColorResolvable>('accentColor'))
            .setTitle(translator.translate('contents.global.embeds.poll.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.poll.description', lang, {
                    user: pingUser(user),
                    question,
                    choices: choices
                        .map((x) =>
                            translator.translate('contents.global.embeds.poll.mapper', lang, {
                                name: x.name,
                                votes: x.count
                            })
                        )
                        .join('\n')
                })
            )
            .addFields({
                name: translator.translate('contents.global.embeds.poll.field', lang),
                value: displayDate(endsAt),
                inline: false
            }),
    tasks: {
        pending: (data: tasks, lang: langResolvable) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(
                    resizeString({
                        str: translator.translate('contents.global.embeds.tasks.pending.description', lang, {
                            description: data.description
                        }),
                        length: 4096
                    })
                )
                .setFields({
                    name: translator.translate('contents.global.embeds.tasks.fields.open.name', lang),
                    value:
                        pingUser(data.opened_by) ??
                        translator.translate('contents.global.embeds.tasks.fields.open.unknown', lang),
                    inline: true
                })
                .setColor(color('taskPending'))
                .setTimestamp(data.startedAt);

            if (notNull(data.deadline) && data.deadline > 0)
                embed.addFields({
                    name: translator.translate('contents.global.embeds.tasks.fields.date.name', lang),
                    value:
                        displayDate(data.deadline) ??
                        translator.translate('contents.global.embeds.tasks.fields.date.unknown', lang),
                    inline: true
                });
            if (notNull(data.image)) embed.setImage(data.image);
            return embed;
        },
        working: (data: tasks, lang: langResolvable) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(
                    resizeString({
                        str: translator.translate('contents.global.embeds.tasks.working.description', lang, {
                            description: data.description
                        }),
                        length: 4096
                    })
                )
                .setFields({
                    name: translator.translate('contents.global.embeds.tasks.fields.open.name', lang),
                    value:
                        pingUser(data.opened_by) ??
                        translator.translate('contents.global.embeds.tasks.fields.open.unknown', lang),
                    inline: true
                })
                .setColor(color('taskWorking'))
                .setTimestamp(data.startedAt);

            if (notNull(data.deadline) && data.deadline > 0)
                embed.addFields({
                    name: translator.translate('contents.global.embeds.tasks.fields.data.name', lang),
                    value:
                        displayDate(data.deadline) ??
                        translator.translate('contents.global.embeds.tasks.working.unknown', lang),
                    inline: true
                });
            if (notNull(data.image)) embed.setImage(data.image);

            embed.addFields({
                name: translator.translate('contents.global.embeds.tasks.fields.assignees.name', lang),
                value:
                    data.assignees.length === 0
                        ? translator.translate('contents.global.embeds.tasks.fields.assignees.unknown', lang)
                        : data.assignees.map(pingUser).join(', '),
                inline: false
            });

            return embed;
        },
        closed: (data: tasks, reason: 'deadline crossed' | 'someone closed', lang: langResolvable) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(
                    resizeString({
                        str: translator.translate('contents.global.embeds.tasks.closed.description', lang, {
                            description: data.description
                        }),
                        length: 4096
                    })
                )
                .setTimestamp()
                .setColor(color('taskClosed'))
                .setFields({
                    name: translator.translate('contents.global.embeds.tasks.closed.informations.name', lang),
                    value: translator.translate(
                        `contents.global.embeds.tasks.closed.informations.${reason === 'deadline crossed' ? 'deadlined' : 'closed'}`,
                        lang
                    ),
                    inline: false
                });
            if (notNull(data.image)) embed.setImage(data.image);

            return embed;
        },
        done: (data: tasks, lang: langResolvable) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(
                    resizeString({
                        str: translator.translate('contents.global.embeds.tasks.done.description', lang, {
                            description: data.description
                        }),
                        length: 4096
                    })
                )
                .setTimestamp()
                .setColor(color('taskDone'));

            if (notNull(data.image)) embed.setImage(data.image);

            return embed;
        },
        unexisting: (user: anyUser, lang: langResolvable) =>
            userMember(user)
                .setTitle(translator.translate('contents.global.embeds.tasks.unexisting.title', lang))
                .setDescription(translator.translate('contents.global.embeds.tasks.unexisting.description', lang)),
        taskEnded: (user: anyUser, lang: langResolvable) =>
            userMember(user)
                .setTitle(translator.translate('contents.global.embeds.tasks.ended.title', lang))
                .setDescription(translator.translate('contents.global.embeds.tasks.ended.description', lang))
    },
    invalidEmoji: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidEmoji.title', lang))
            .setDescription(translator.translate('contents.global.embeds.invalidEmoji.description', lang)),
    requestStopped: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.requestStopped.title', lang))
            .setDescription(translator.translate('contents.global.embeds.requestStopped.description', lang)),
    invalidChannel: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidChannel.title', lang))
            .setDescription(translator.translate('contents.global.embeds.invalidChannel.description', lang)),
    invalidChannelType: (user: anyUser, types: ChannelType[], lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidChannelType.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.invalidChannelType.description', lang, {
                    types: types
                        .map((x) => translator.translate(`contents.global.channels.${x.toString()}`, lang))
                        .join(', ')
                })
            ),
    configDisabled: (user: anyUser, config: keyof configKeys, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.configDisabled.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.configDisabled.description', lang, {
                    param: translator.translate(`contents.global.configs.${config}.name`, lang)
                })
            ),
    invalidInput: (user: anyUser, lang: langResolvable, opts?: { test?: 'key'; letters?: string }) => {
        const prefix = opts?.test === 'key' ? 'Key' : 'Message';

        return userMember(user)
            .setTitle(translator.translate(`contents.global.embeds.invalidInput.invalid${prefix}`, lang))
            .setDescription(
                translator.translate(`contents.global.embeds.invalidInput.description${prefix}`, lang, {
                    letters: opts?.letters ?? inputLetters()
                })
            );
    },
    askImage: (user: User, dimens: { height: number; width: number }, lang: langResolvable) =>
        basic(user, { questionMark: true })
            .setTitle(translator.translate('contents.global.embeds.askImage.title', lang))
            .setDescription(translator.translate('contents.global.embeds.askImage.description', lang, dimens)),
    noImage: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.noImage.title', lang))
            .setDescription(translator.translate('contents.global.embeds.noImage.description', lang)),
    invalidDimens: (user: anyUser, dimens: { height: number; width: number }, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidDimens.title', lang))
            .setDescription(translator.translate('contents.global.embeds.invalidDimens.description', lang, dimens)),
    imageTooLarge: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.imageTooLarge.title', lang))
            .setDescription(translator.translate('contents.global.embeds.imageTooLarge.description', lang)),
    noEmoji: (user: anyUser, lang: langResolvable, query?: string) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.noEmoji.title', lang))
            .setDescription(
                translator.translate(`contents.global.embeds.noEmoji.description${!!query ? 'Query' : ''}`, lang, {
                    query
                })
            ),
    basicGuild: (user: anyUser, guild: Guild) => userMember(user).setColor(guild?.members?.me?.displayHexColor),
    noCounter: (user: anyUser, lang: langResolvable) =>
        userMember(user)
            .setTitle(translator.translate('contents.global.embeds.countersDesactivated.title', lang))
            .setDescription(translator.translate('contents.global.embeds.countersDesactivated.description', lang)),
    roleTooHigh: (user: anyUser, role: Role | string, lang: langResolvable) => userMember(user).setTitle(translator.translate('contents.global.embeds.roleTooHigh.title', lang)).setDescription(translator.translate('contents.global.embeds.roleTooHigh.description', lang, { role: pingRole(role) }))
};

export type replyKey = keyof typeof replies;

export default replies;
