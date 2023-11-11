import { Precondition } from 'amethystjs';
import { DraverCommand } from '../structures/DraverCommand';
import { moduleType } from '../typings/database';

export default new Precondition('moduleEnabled')
    .setChatInputRun(({ command, interaction }) => {
        if (!interaction.guild) {
            return {
                ok: true,
                interaction,
                type: 'chatInput'
            };
        }
        const module = (command as DraverCommand).module as moduleType;

        const state = interaction.client.modulesManager.enabled(interaction.guildId, module);
        if (!state) {
            return {
                ok: false,
                type: 'chatInput',
                interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: module
                }
            };
        }
        return {
            ok: true,
            type: 'chatInput',
            interaction
        };
    })
    .setUserContextMenuRun(({ command, interaction }) => {
        if (!interaction.guild) return { ok: true, contextMenu: interaction, type: 'userContextMenu' };

        const module = (command as DraverCommand).module as moduleType;

        const state = interaction.client.modulesManager.enabled(interaction.guildId, module);
        if (!state)
            return {
                ok: false,
                type: 'userContextMenu',
                contextMenu: interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: module
                }
            };
        return {
            ok: true,
            type: 'userContextMenu',
            contextMenu: interaction
        };
    })
    .setMessageContextMenuRun(({ command, interaction }) => {
        if (!interaction.guild) return { ok: true, contextMenu: interaction, type: 'userContextMenu' };

        const module = (command as DraverCommand).module as moduleType;

        const state = interaction.client.modulesManager.enabled(interaction.guildId, module);
        if (!state)
            return {
                ok: false,
                type: 'userContextMenu',
                contextMenu: interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: module
                }
            };
        return {
            ok: true,
            type: 'userContextMenu',
            contextMenu: interaction
        };
    });
