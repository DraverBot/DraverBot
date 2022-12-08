import { Guild, PermissionsString, User } from 'discord.js';
import { moduleType } from '../typings/database';
import { permType } from '../typings/functions';
import { getPerm, moduleName } from '../utils/functions';
import { basicEmbed as basic, evokerColor } from '../utils/toolbox';

const replies = {
    guildOnly: (user: User) => {
        return basic(user)
            .setTitle(':x: Serveur uniquement')
            .setDescription(`Cette commande n'est disponible que sur un serveur`)
            .setColor('#ff0000');
    },
    DMOnly: (user: User) => {
        return basic(user)
            .setTitle(':x: Message privés uniquement')
            .setDescription(`Cette commande n'est disponible qu'en messages privés`)
            .setColor('#ff0000');
    },
    clientMissingPermissions: (user: User, metadata: { permissions?: { missing: PermissionsString[] } }) => {
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
            .setColor('#ff0000');
    },
    userMissingPermissions: (user: User, metadata: { permissions?: { missing: PermissionsString[] } }) => {
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
            .setColor('#ff0000');
    },
    underCooldown: (user: User, metadata: { remainingCooldownTime?: number }) => {
        return basic(user)
            .setTitle(':x: Cooldown')
            .setDescription(
                `Vous êtes sous cooldown.\nMerci de patienter encore **${
                    Math.floor(metadata.remainingCooldownTime) / 1000
                } secondes**`
            )
            .setColor('#ff0000');
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
    }
};

export type replyKey = keyof typeof replies;

export default replies;
