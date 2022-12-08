import { EmbedBuilder, Guild, GuildMember, PermissionsString, User } from 'discord.js';
import errors from '../maps/errors';
import { moduleType } from '../typings/database';
import { permType } from '../typings/functions';
import { getPerm, moduleName, util } from '../utils/functions';
import { basicEmbed as basic, evokerColor } from '../utils/toolbox';

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
    clientMissingPermissions: (user: User, metadata: { permissions?: { missing: PermissionsString[] }, guild?: Guild }) => {
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
    userMissingPermissions: (user: User, metadata: { permissions?: { missing: PermissionsString[] }, guild?: Guild }) => {
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
    underCooldown: (user: User, metadata: { remainingCooldownTime?: number, guild?: Guild }) => {
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
        return basic(user)
            .setTitle(':x: Module désactivé')
            .setDescription(`Le module \`${moduleName(module)}\` est désactivé.`)
            .setColor(evokerColor(guild));
    },
    invalidProofType: (user: User, { guild }: { guild: Guild }) => {
        return basic(user)
            .setColor(evokerColor(guild))
            .setTitle(`:x: Preuve invalide`)
            .setDescription(`Désolé, les preuves doivent être sous format **image**`)
    },
    cancel: () => {
        return new EmbedBuilder()
            .setTitle('💡 Annulé')
            .setColor('Yellow')
    },
    mysqlError: (user: User, metadata: { guild?: Guild }) => {
        let text = `Une erreur a eu lieu lors de l'interaction avec la base de données.\nPatientez quelques secondes et réessayez.`
        if (errors.has(user.id)) {
            if (errors.get(user.id) > 3) {
                text += `\nSi l'erreur persiste, contactez mes développeurs`;
            }
        }
        errors.set(user.id, (errors.get(user.id) ?? 0) + 1);
        return basic(user)
            .setColor(evokerColor(metadata.guild))
            .setDescription(text)
            .setTitle("Erreur")
    },
    memberOwner: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle("Membre propriétaire")
            .setDescription(`Vous ne pouvez pas faire ça, car ${member} est le propriétaire du serveur`)
    },
    memberBot: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle("Robot")
            .setDescription(`${member} est un robot. Je ne peux pas effectuer cette action sur un robot`)
    },
    memberTooHigh: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setColor(evokerColor(member.guild))
            .setTitle("Membre trop haut")
            .setDescription(`${member} est supérieur ou égal à vous dans la hiéararchie des rôles`)
    },
    memberTooHighClient: (user: User, { member }: { member: GuildMember }) => {
        return basic(user)
            .setTitle("Membre trop haut")
            .setDescription(`${member} est supérieur ou égal à moi dans la hiérarchie des rôles`)
            .setColor(evokerColor(member.guild))
    },
    notEnoughCoins: (user: GuildMember, target = user) => {
        return basic(user.user)
            .setTitle(`Pas assez ${util('coinsPrefix')}`)
            .setDescription(`${target} n'as pas assez ${util('coinsPrefix')} pour faire ça`)
            .setColor(evokerColor(user.guild))
    }
};

export type replyKey = keyof typeof replies;

export default replies;
