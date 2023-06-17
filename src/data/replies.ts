import { ColorResolvable, EmbedBuilder, Guild, GuildMember, PermissionsString, TextChannel, User } from 'discord.js';
import errors from '../maps/errors';
import { moduleType } from '../typings/database';
import { permType } from '../typings/functions';
import { getRolePerm, moduleName, util } from '../utils/functions';
import {
    addTimeDoc,
    anyHexColor,
    basicEmbed as basic,
    displayDate,
    evokerColor,
    numerize,
    pingChan,
    pingUser,
    plurial,
    random
} from '../utils/toolbox';
import modules from '../maps/modules';

export type anyUser = User | GuildMember;

const userMember = (user: anyUser, color?: ColorResolvable) => {
    const embed = basic(user instanceof User ? user : user.user).setColor(color ?? '#ff0000');
    if (user instanceof GuildMember) embed.setColor(evokerColor(user.guild));

    return embed;
};

const replies = {
    guildOnly: (user: User, metadata: { guild?: Guild }) => {
        return basic(user)
            .setTitle(':x: Serveur uniquement')
            .setDescription(`Cette commande n'est disponible que sur un serveur`)
            .setColor(evokerColor(metadata.guild));
    },
    DMOnly: (user: User, metadata: { guild?: Guild }) => {
        return basic(user)
            .setTitle(':x: Message privés uniquement')
            .setDescription(`Cette commande n'est disponible qu'en messages privés`)
            .setColor(evokerColor(metadata.guild));
    },
    clientMissingPermissions: (
        user: User,
        metadata: { permissions?: { missing: PermissionsString[] }; guild?: Guild }
    ) => {
        const { missing } = metadata.permissions;

        return basic(user)
            .setTitle(':x: Permissions insuffisantes')
            .setDescription(
                `Je n'ai pas les permissions nécéssaires pour éxécuter cette commande.\n${
                    missing.length === 1
                        ? `Vérifiez que j'aie bien la permission \`${getRolePerm(missing[0] as permType<'role'>)}\``
                        : `Vérifiez que j'aie bien les permissions : ${missing
                              .map((perm) => `\`${getRolePerm(perm as permType<'role'>)}\``)
                              .join(' ')}`
                }`
            )
            .setColor(evokerColor(metadata.guild));
    },
    userMissingPermissions: (
        user: User,
        metadata: { permissions?: { missing: PermissionsString[] }; guild?: Guild }
    ) => {
        const { missing } = metadata.permissions;

        return basic(user)
            .setTitle(':x: Permissions insuffisantes')
            .setDescription(
                `Vous n'avez pas pas les permissions nécéssaires pour éxécuter cette commande.\n${
                    missing.length === 1
                        ? `Vérifiez que vous ayez bien la permission \`${getRolePerm(missing[0] as permType<'role'>)}\``
                        : `Vérifiez que vous ayez bien les permissions : ${missing
                              .map((perm) => `\`${getRolePerm(perm as permType<'role'>)}\``)
                              .join(' ')}`
                }`
            )
            .setColor(evokerColor(metadata.guild));
    },
    underCooldown: (user: User, metadata: { remainingCooldownTime?: number; guild?: Guild }) => {
        return basic(user)
            .setTitle(':x: Cooldown')
            .setDescription(
                `Vous êtes sous cooldown.\nMerci de patienter encore **${
                    Math.floor(metadata.remainingCooldownTime) / 1000
                } secondes**`
            )
            .setColor(evokerColor(metadata.guild));
    },
    moduleDisabled: (user: User, { guild, module }: { guild: Guild; module: moduleType }) => {
        const embed = basic(user)
            .setTitle(':x: Module désactivé')
            .setDescription(`Le module \`${moduleName(module)}\` est désactivé.`)
            .setColor(evokerColor(guild));

        const times = modules.get(user.id) ?? 0;
        if (times >= 5) {
            embed.setDescription(
                `${embed.data.description}\n\n:bulb:\n> Pour activer un module, utilisez la commande \`/module configurer\``
            );
        }
        modules.set(user.id, times + 1);
        return embed;
    },
    invalidProofType: (user: User, { guild }: { guild: Guild }) => {
        return basic(user)
            .setColor(evokerColor(guild))
            .setTitle(`:x: Preuve invalide`)
            .setDescription(`Désolé, les preuves doivent être sous format **image**`);
    },
    cancel: () => {
        return new EmbedBuilder().setTitle('💡 Annulé').setColor('Yellow');
    },
    mysqlError: (user: User, metadata: { guild?: Guild }) => {
        let text = `Une erreur a eu lieu lors de l'interaction avec la base de données.\nPatientez quelques secondes et réessayez.`;
        if (errors.has(user.id)) {
            if (errors.get(user.id) > 3) {
                text += `\nSi l'erreur persiste, contactez mes développeurs`;
            }
        }
        errors.set(user.id, (errors.get(user.id) ?? 0) + 1);
        return basic(user).setColor(evokerColor(metadata.guild)).setDescription(text).setTitle('Erreur');
    },
    memberOwner: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle('Membre propriétaire')
            .setDescription(`Vous ne pouvez pas faire ça, car ${member} est le propriétaire du serveur`);
    },
    memberBot: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle('Robot')
            .setDescription(`${member} est un robot. Je ne peux pas effectuer cette action sur un robot`);
    },
    memberTooHigh: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle('Membre trop haut')
            .setDescription(`${member} est supérieur ou égal à vous dans la hiéararchie des rôles`);
    },
    memberTooHighClient: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setTitle('Membre trop haut')
            .setDescription(`${member} est supérieur ou égal à moi dans la hiérarchie des rôles`)
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
            .addFields({ name: 'Fin', value: displayDate(endsAt), inline: false })
};

export type replyKey = keyof typeof replies;

export default replies;
