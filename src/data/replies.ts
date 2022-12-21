import { ColorResolvable, EmbedBuilder, Guild, GuildMember, PermissionsString, TextChannel, User } from 'discord.js';
import errors from '../maps/errors';
import { moduleType } from '../typings/database';
import { permType } from '../typings/functions';
import { getPerm, moduleName, util } from '../utils/functions';
import { addTimeDoc, basicEmbed as basic, evokerColor, pingChan } from '../utils/toolbox';
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
                        ? `Vérifiez que j'aie bien la permission \`${getPerm(missing[0] as permType)}\``
                        : `Vérifiez que j'aie bien les permissions : ${missing
                              .map((perm) => `\`${getPerm(perm as permType)}\``)
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
                        ? `Vérifiez que vous ayez bien la permission \`${getPerm(missing[0] as permType)}\``
                        : `Vérifiez que vous ayez bien les permissions : ${missing
                              .map((perm) => `\`${getPerm(perm as permType)}\``)
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
    interserverWebhookFailed: (user: anyUser, metadata: {}) => {
        return userMember(user)
            .setTitle('Pas de webhook')
            .setDescription(
                `Je n'ai pas pu créer de webhook.\nVérifiez que je possède la permission \`gérer les webhooks\` et réessayez`
            );
    },
    interserverNoFrequence: (user: anyUser, metadata: {}) => {
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
    }
};

export type replyKey = keyof typeof replies;

export default replies;
