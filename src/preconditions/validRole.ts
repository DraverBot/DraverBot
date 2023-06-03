import { Precondition } from 'amethystjs';
import { GuildMember, Role } from 'discord.js';
import { basicEmbed, evokerColor, pingRole } from '../utils/toolbox';

export default new Precondition('goodRole').setChatInputRun(({ interaction, options }) => {
    const role = options.getRole('rôle') as Role;
    const roles = (interaction.member as GuildMember).roles;

    if (role && role.position >= roles.highest.position) {
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Rôle trop haut')
                        .setDescription(
                            `Le rôle ${pingRole(role)} est supérieur ou égal à vous dans la hiérarchie des rôles`
                        )
                        .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            })
            .catch(() => {});

        return {
            ok: false,
            interaction,
            type: 'chatInput',
            metadata: {
                silent: true
            }
        };
    }
    if (role && role.position >= interaction.guild.members.me.roles.highest.position) {
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Rôle trop haut')
                        .setDescription(
                            `Le rôle ${pingRole(role)} est supérieur ou égal à moi dans la hiérarchie des rôles`
                        )
                        .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            })
            .catch(() => {});

        return {
            ok: false,
            type: 'chatInput',
            interaction,
            metadata: {
                silent: true
            }
        };
    }
    return {
        ok: true,
        type: 'chatInput',
        interaction
    };
});
