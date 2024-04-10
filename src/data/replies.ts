/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    APIInteractionGuildMember,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
    Guild,
    GuildMember,
    PermissionsString,
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
                translator.translate(`contents.global.embeds.notEnoughCoins.${target.id === user.id ? 'self' : 'other'}Description`, lang, {
                    user: pingUser(target)
                })
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
            .setDescription(translator.translate('contents.global.embeds.unexistingLog.description', lang, { id: parseInt(id) }));
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
            .setDescription(translator.translate('contents.global.embeds.interserverAlreadySet.description', metadata.lang, { channel: pingChan(metadata.channel_id) }));
    },
    interserverUnexistingFrequence: (user: anyUser, { frequence, lang }: { frequence: string; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.unexistingFrequence.title', lang))
            .setDescription(translator.translate('contents.global.embeds.unexistingFrequence.description', lang, { frequence }));
    },
    interserverFrequenceAssigned: (user: anyUser, { frequence, lang }: { frequence: string; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.frequenceAssigned.title', lang))
            .setDescription(translator.translate('contents.global.embeds.frequenceAssigned.description', lang, { frequence }));
    },
    interserverWebhookFailed: (user: anyUser, metadata: object & { lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.webhookFailed.title', metadata.lang))
            .setDescription(
                translator.translate('contents.global.embeds.webhookFailed.description', metadata.lang)
            );
    },
    interserverNoFrequence: (user: anyUser, metadata: object & { lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.noFrequence.title', metadata.lang))
            .setDescription(
                translator.translate('contents.global.embeds.noFrequence.description', metadata.lang)
            );
    },
    interserverNotChannel: (user: anyUser, metadata: { channel: TextChannel; lang: langResolvable }) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.interserverNotChannel.title', metadata.lang))
            .setDescription(translator.translate('contents.global.embeds.interserverNotChannel.description', metadata.lang, { channel: pingChan(metadata.channel) }));
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
            .setDescription(translator.translate('contents.global.embeds.invalidTime.descriptoin', lang, {
                timeDoc: addTimeDoc(user.id, lang)
            }))
    },
    invalidColor: (user: anyUser, lang: langResolvable) => {
        return userMember(user)
            .setTitle(translator.translate('contents.global.embeds.invalidColor.title', lang))
            .setDescription(
                translator.translate('contents.global.embeds.invalidColor.description', lang, {
                    colorOne: anyHexColor(
                        { hashtagIncluded: false, type: 'long' }
                    ),
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
                .setDescription(translator.translate('contents.global.embeds.loto.participationRegistered.description', lang)),
        alreadyParticipate: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.alreadyParticipate.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.alreadyParticipate.description', lang)),
        noParticipation: (user: User, guild: Guild, lang: langResolvable) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle(translator.translate('contents.global.embeds.loto.noParticipation.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.noParticipation.description', lang)),
        participationDeleted: (user: User, lang: langResolvable) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.participationDeleted.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.participationDeleted.description', lang)),
        lotoDeleted: (user: User, lang: langResolvable) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.lotoDeleted.title', lang))
                .setDescription(translator.translate('contents.global.embeds.loto.lotoDeleted.description', lang)),
        lotoStarted: (user: User, data: { coins: number; complementaries: number; numbers: number; endsAt: number; lang: langResolvable }) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.started.title', data.lang))
                .setDescription(
                    translator.translate(`contents.global.embeds.loto.started.description${data.coins > 0 ? 'Coins' : ''}`, data.lang, {
                        user: pingUser(user),
                        winnings: data.numbers,
                        complementaries: data.complementaries,
                        date: displayDate(data.endsAt),
                        prize: data.coins
                    })
                )
                .setTimestamp(data.endsAt),
        invalidParticipation: (user: User, guild: Guild, data: { numbers: number; complementaries: number; lang: langResolvable }) => {
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
                    translator.translate(`contents.global.embeds.loto.invalidParticipation.description${data.complementaries > 0 ? 'Complementaries' : ''}`, data.lang, {
                        numbers: data.numbers,
                        complementaries: data.complementaries,
                        exampleNumbers: numbers.join(' '),
                        complementariesExample: complementaries.join(' ')
                    })
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
                        translator.translate(`contents.global.embeds.loto.result.noWinner${rolled.complementaries.length > 0 ? 'Complementaries' : ''}`, lang, {
                            rolled: rolled.numbers.join(' '),
                            complementaries: rolled.complementaries?.join?.(' ')
                        })
                    );
            return userMember(user, util<ColorResolvable>('accentColor'))
                .setTitle(translator.translate('contents.global.embeds.loto.result.title', lang))
                .setDescription(
                    translator.translate(`contents.global.embeds.loto.result.winner${rolled.complementaries.length > 0 ? 'Complementaries' : ''}`, lang, {
                        rolled: rolled.numbers.join(' '),
                        complementariesRolled: rolled.complementaries?.join?.(' '),
                        winners: winners.map(w => translator.translate('contents.global.embeds.loto.result.mapper', lang, {
                            user: pingUser(w.userId),
                            accuracy: w.accuracy * 100,
                            reward: w.reward
                        })).join('\n')
                    })
                );
        }
    },
    internalError: (user: anyUser) =>
        userMember(user)
            .setTitle('Erreur interne')
            .setDescription(
                `Une erreur interne est survenue.\nVeuillez réeesayer. Si l'erreur persiste, contactez mon [serveur de support](${util(
                    'support'
                )})`
            ),
    pollEmbed: (
        user: User,
        question: string,
        endsAt: number,
        choices: { name: string; count: number; id?: number }[]
    ) =>
        userMember(user, util<ColorResolvable>('accentColor'))
            .setTitle('Sondage')
            .setDescription(
                `Sondage lancé par ${pingUser(user)}\n> ${question}\n\n${choices
                    .map((x) => `${x.name} ( ${x.count} vote${plurial(x.count)} )`)
                    .join('\n')}`
            )
            .addFields({ name: 'Fin', value: displayDate(endsAt), inline: false }),
    tasks: {
        pending: (data: tasks) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(
                    resizeString({
                        str: `Tâche en attente\n${data.description}\n\nAssignez-vous pour commencer la tâche`,
                        length: 4096
                    })
                )
                .setFields({ name: 'Ouvert par', value: pingUser(data.opened_by) ?? 'inconnu', inline: true })
                .setColor(color('taskPending'))
                .setTimestamp(data.startedAt);

            if (notNull(data.deadline) && data.deadline > 0)
                embed.addFields({
                    name: 'À faire avant',
                    value: displayDate(data.deadline) ?? 'Inconnu',
                    inline: true
                });
            if (notNull(data.image)) embed.setImage(data.image);
            return embed;
        },
        working: (data: tasks) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(resizeString({ str: `Tâche en cours\n${data.description}`, length: 4096 }))
                .setFields({ name: 'Ouvert par', value: pingUser(data.opened_by), inline: true })
                .setColor(color('taskWorking'))
                .setTimestamp(data.startedAt);

            if (notNull(data.deadline) && data.deadline > 0)
                embed.addFields({ name: 'À faire avant', value: displayDate(data.deadline), inline: true });
            if (notNull(data.image)) embed.setImage(data.image);

            embed.addFields({
                name: 'Assigné' + plurial(data.assignees),
                value: data.assignees.length === 0 ? 'Aucun assigné' : data.assignees.map(pingUser).join(', '),
                inline: false
            });

            return embed;
        },
        closed: (data: tasks, reason: 'deadline crossed' | 'someone closed') => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(resizeString({ str: `Tâche fermée\n${data.description}`, length: 4096 }))
                .setTimestamp()
                .setColor(color('taskClosed'))
                .setFields({
                    name: 'Informations',
                    value:
                        reason === 'deadline crossed' ? `La date limite a été atteinte` : `Quelqu'un a fermé la tâche`,
                    inline: false
                });
            if (notNull(data.image)) embed.setImage(data.image);

            return embed;
        },
        done: (data: tasks) => {
            const embed = new EmbedBuilder()
                .setTitle(resizeString({ str: data.name, length: 256 }))
                .setDescription(resizeString({ str: `La tâche a été terminée\n${data.description}`, length: 4096 }))
                .setTimestamp()
                .setColor(color('taskDone'));

            if (notNull(data.image)) embed.setImage(data.image);

            return embed;
        },
        unexisting: (user: anyUser) =>
            userMember(user).setTitle('Tâche inexistante').setDescription(`Cette tâche n'existe pas`),
        taskEnded: (user: anyUser) =>
            userMember(user)
                .setTitle('Tâche terminée')
                .setDescription(`Cette tâche est terminée, vous ne pouvez pas assigner quelqu'un`)
    },
    invalidEmoji: (user: anyUser) =>
        userMember(user)
            .setTitle('Émoji invalide')
            .setDescription(
                `Ce n'est pas un émoji valide.\nVeuillez envoyer un émoji correct, et assurez-vous que je puisse accéder à cet émoji`
            ),
    requestStopped: (user: anyUser) =>
        userMember(user)
            .setTitle('Erreur')
            .setDescription(
                `Les données n'ont pas pu être trouvées à cause d'un problème venant de la plateforme.\nPatientez quelques minutes, puis réessayez.\nSi cette erreur persiste, contactez le développeur, par le [serveur de support](${util(
                    'support'
                )}) ou par l'adresse email ( \`${util('email')}\` )`
            ),
    invalidChannel: (user: anyUser) =>
        userMember(user)
            .setTitle('Salon invalide')
            .setDescription(`Ce n'est pas un salon valide, réessayez avec un nom, un identifiant ou une mention`),
    invalidChannelType: (user: anyUser, types: ChannelType[]) => {
        const vals: Record<ChannelType, string> = {
            10: "fil d'annonce",
            1: 'messages privés',
            3: 'groupe privé',
            5: 'annonces',
            4: 'catégorie',
            14: 'catégorie',
            15: 'forum',
            12: 'fil privé',
            11: 'fil public',
            13: 'conférences',
            0: 'textuel',
            2: 'vocal',
            16: 'médiatique'
        };

        return userMember(user)
            .setTitle('Type de salon invalide')
            .setDescription(
                `Ce n'est pas un salon valide, veuillez spécifier un salon de type : ${types
                    .map((x) => vals[x])
                    .join(', ')}`
            );
    },
    configDisabled: (user: anyUser, config: keyof configKeys) =>
        userMember(user)
            .setTitle('Paramètre désactivé')
            .setDescription(`Le paramètre **${configsData[config].name}** est désactivé`),
    invalidInput: (user: anyUser, opts?: { test?: 'key'; letters?: string }) =>
        userMember(user)
            .setTitle(`${opts?.test === 'key' ? 'Clé' : 'Message'} invalide`)
            .setDescription(
                `Je ne peux pas chiffrer ce message, car ${
                    opts?.test === 'key' ? 'la clé' : 'il'
                } contient des caractères que je peux pas chiffrer.\nAssurez-vous que ${
                    opts?.test === 'key' ? 'la clé' : 'votre message'
                } contienne uniquement ces caractères :\n\`\`\`${opts?.letters ?? inputLetters()}\`\`\``
            ),
    askImage: (user: User, dimens: { height: number; width: number }) =>
        basic(user, { questionMark: true })
            .setTitle('Image')
            .setDescription(
                `Envoyez une image dans le chat, de dimensions au maximum de ${dimens.width} par ${dimens.height} pixels et de 1Mo au maximum\nRépondez par \`cancel\` pour annuler`
            ),
    noImage: (user: anyUser) =>
        userMember(user).setTitle("Pas d'image").setDescription(`Vous n'avez pas envoyé d'image dans votre message`),
    invalidDimens: (user: anyUser, { width, height }: { height: number; width: number }) =>
        userMember(user)
            .setTitle('Image invalide')
            .setDescription(`Veuillez envoyer une image au maximum de ${width} par ${height} pixels`),
    imageToLarge: (user: anyUser) =>
        userMember(user).setTitle('Image trop grande').setDescription(`Votre image ne doit pas dépasser **1 Mo**`),
    noEmoji: (user: anyUser, query?: string) =>
        userMember(user)
            .setTitle('Aucun émoji')
            .setDescription(`Aucun émoji n'a été trouvé${!!query ? ` pour \`${query}\`` : ''}`),
    basicGuild: (user: anyUser, guild: Guild) => userMember(user).setColor(guild?.members?.me?.displayHexColor),
    noCounter: (user: anyUser) =>
        userMember(user)
            .setTitle('Compteurs désactivés')
            .setDescription(
                `Les compteurs n'ont pas été activés.\nUtilisez la commande \`/compteurs activer\` pour les mettre en place`
            )
};

export type replyKey = keyof typeof replies;

export default replies;
