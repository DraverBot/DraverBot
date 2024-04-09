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
    notEnoughCoins: (user: GuildMember, target = user) => {
        return basic(user.user)
            .setTitle(`Pas assez ${util('coinsPrefix')}`)
            .setDescription(
                `${target.id === user.id ? "Vous n'avez" : `${target} n'a`} pas assez ${util(
                    'coinsPrefix'
                )} pour faire ça`
            )
            .setColor(evokerColor(user.guild));
    },
    selfMod: ({ user, guild }: GuildMember, metadata: any) => {
        return basic(user)
            .setTitle(`Auto-modération`)
            .setDescription(`Vous ne pouvez pas faire ça sur vous-même`)
            .setColor(evokerColor(guild));
    },
    replyNotAllowed: (user: anyUser) => {
        return userMember(user)
            .setTitle('Interaction non-autorisée')
            .setDescription(`Vous n'êtes pas autorisé à interagir avec ce message`);
    },
    unexistingLog: (user: anyUser, id: string) => {
        return userMember(user)
            .setTitle('Log inexistant')
            .setDescription(`Le log d'identifiant \`${id}\` n'existe pas sur ce serveur.`);
    },
    deletedLog: (user: anyUser, id: string) => {
        return userMember(user)
            .setTitle('Log supprimé')
            .setDescription(
                `Le log d'identifiant \`${id}\` est supprimé.\nVous ne pouvez pas faire ça sur un log supprimé`
            );
    },
    ownerOnly: (user: User, { guild }: { guild: Guild }) => {
        return basic(user)
            .setColor(evokerColor(guild))
            .setTitle('Propriétaire uniquement')
            .setDescription(`Cette commande est réservée au propriétaire du serveur`);
    },
    interserverAlreadySet: (user: anyUser, metadata: { channel_id: string }) => {
        return userMember(user)
            .setTitle('Salon déjà configuré')
            .setDescription(`Le salon ${pingChan(metadata.channel_id)} est déjà un salon d'interchat`);
    },
    interserverUnexistingFrequence: (user: anyUser, { frequence }: { frequence: string }) => {
        return userMember(user)
            .setTitle('Fréquence invalide')
            .setDescription(`La fréquence \`${frequence}\` n'est utilisée dans aucun autre serveur`);
    },
    interserverFrequenceAssigned: (user: anyUser, { frequence }: { frequence: string }) => {
        return userMember(user)
            .setTitle('Fréquence déjà utilisée')
            .setDescription(`Cette fréquence est déjà utilisée dans un autre salon du serveur`);
    },
    interserverWebhookFailed: (user: anyUser, metadata: object) => {
        return userMember(user)
            .setTitle('Pas de webhook')
            .setDescription(
                `Je n'ai pas pu créer de webhook.\nVérifiez que je possède la permission \`gérer les webhooks\` et réessayez`
            );
    },
    interserverNoFrequence: (user: anyUser, metadata: object) => {
        return userMember(user)
            .setTitle('Pas de fréquence')
            .setDescription(
                `Vous n'êtes pas censé voir ce message.\nCette erreur arrive lorsque je n'ai pas réussi à générer une fréquence unique pour votre salon.\nUne des solutions est de réessayer la commande`
            );
    },
    interserverNotChannel: (user: anyUser, metadata: { channel: TextChannel }) => {
        return userMember(user)
            .setTitle('Salon invalide')
            .setDescription(`Le salon ${pingChan(metadata.channel)} n'est pas un salon d'interchat`);
    },
    wait: (user: User) => {
        return basic(user)
            .setTitle('Patientez...')
            .setDescription(`Merci de patienter quelques instants`)
            .setColor('Orange');
    },
    invalidNumber: (user: anyUser) => {
        return userMember(user)
            .setTitle('Nombre invalide')
            .setDescription(`Merci de saisir un nombre valide, supérieur à 0`);
    },
    invalidTime: (user: anyUser) => {
        return userMember(user)
            .setTitle('Temps invalide')
            .setDescription(`Vous n'avez pas saisi une durée valide${addTimeDoc(user.id)}`);
    },
    invalidColor: (user: anyUser) => {
        return userMember(user)
            .setTitle('Couleur invalide')
            .setDescription(
                `Vous n'avez pas saisi une couleur valide.\nVoici quelques exemples de couleurs valides :\n\`${anyHexColor(
                    { hashtagIncluded: false, type: 'long' }
                )}\`\n\`${anyHexColor({ hashtagIncluded: true, type: 'long' })}\`\n\`${anyHexColor({
                    type: 'short',
                    hashtagIncluded: true
                })}\``
            );
    },
    loto: {
        noCurrentLoto: (user: User, guild: Guild) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle('Loto inexistant')
                .setDescription(`Il n'y a aucun giveaway en cours sur ce serveur`),
        participationRegistered: (user: User) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle('Participation enregistrée')
                .setDescription(`Votre participation au loto a été enregistrée`),
        alreadyParticipate: (user: User, guild: Guild) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle('Participation déjà enregistrée')
                .setDescription(`Vous participez déjà au loto`),
        noParticipation: (user: User, guild: Guild) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle('Participation non enregistrée')
                .setDescription(`Vous ne participez pas au loto sur ce serveur`),
        participationDeleted: (user: User) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle('Participation retirée')
                .setDescription(`Votre participation au loto a été annulée`),
        lotoDeleted: (user: User) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle('Loto supprimé')
                .setDescription(`Le loto a été annulé sur le serveur`),
        lotoStarted: (user: User, data: { coins: number; complementaries: number; numbers: number; endsAt: number }) =>
            userMember(user)
                .setColor(util<ColorResolvable>('accentColor'))
                .setTitle('Loto')
                .setDescription(
                    `Un loto a été lancé par ${pingUser(
                        user
                    )} !\nPour participer, utilisez la commande \`/loto participer\`\n\nModalités :\n* ${numerize(
                        data.numbers
                    )} numéros gagnants nécessaires\n* ${numerize(data.complementaries)} numéro${plurial(
                        data.complementaries
                    )} complémentaire${plurial(data.complementaries)} nécessaires\n* Se finit ${displayDate(
                        data.endsAt
                    )}${
                        data.coins > 0
                            ? `\n* ${numerize(data.coins)} ${util('coins')} sont en jeu à partager entre les gagnants`
                            : ''
                    }`
                )
                .setTimestamp(data.endsAt),
        invalidParticipation: (user: User, guild: Guild, data: { numbers: number; complementaries: number }) => {
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
                .setTitle('Participation invalide')
                .setDescription(
                    `Votre participation est invalide.\nVous devez spécifier **${
                        data.numbers
                    }** numéros gagnants, et **${data.complementaries}** numéro${plurial(
                        data.complementaries
                    )} complémentaire${plurial(
                        data.complementaries
                    )} tous différents\n\nPar exemple :\n* Numéros gagnants : \`${numbers.join(' ')}\`${
                        data.complementaries > 0
                            ? `\n* Numéro${plurial(data.complementaries)} complémentaire${plurial(
                                  data.complementaries
                              )} : \`${complementaries.join(' ')}\``
                            : ''
                    }`
                );
        },
        lotoAlreadyStarted: (user: User, guild: Guild) =>
            userMember(user)
                .setColor(evokerColor(guild))
                .setTitle('Loto déjà lancé')
                .setDescription(`Un loto existe déjà sur ${guild.name}`),
        lotoResult: (
            user: User,
            rolled: { numbers: number[]; complementaries: number[] },
            winners: {
                userId: string;
                numbers: number[];
                complementaries: number[];
                accuracy: number;
                reward: number;
            }[]
        ) => {
            if (winners.length == 0)
                return userMember(user, util<ColorResolvable>('accentColor'))
                    .setTitle('Résultats du loto')
                    .setDescription(
                        `Numéros tirés :\n* Gagnants : \`${rolled.numbers.join(' ')}\`${
                            rolled.complementaries.length > 0
                                ? `\n* Complémentaire${plurial(
                                      rolled.complementaries
                                  )} : \`${rolled.complementaries.join(' ')}\``
                                : ''
                        }\n\nIl n'y a aucun gagnant pour ce loto`
                    );
            return userMember(user, util<ColorResolvable>('accentColor'))
                .setTitle('Résultats du loto')
                .setDescription(
                    `Numéros tirés :\n* Gagnants : \`${rolled.numbers.join(' ')}\`${
                        rolled.complementaries.length > 0
                            ? `\n* Complémentaire${plurial(rolled.complementaries)} : \`${rolled.complementaries.join(
                                  ' '
                              )}\``
                            : ''
                    }\n\nGagnants : ${winners
                        .map(
                            (w) =>
                                `${pingUser(w.userId)} avec ${w.accuracy * 100}% de précision ( ${w.reward} ${util(
                                    'coins'
                                )} )`
                        )
                        .join('\n')}`
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
