import { Precondition } from 'amethystjs';
import { Module } from '../utils/functions';

export default new Precondition('moduleEnabled')
    .setChatInputRun(({ command, interaction }) => {
        if (!interaction.guild) {
            return {
                ok: true,
                interaction,
                type: 'chatInput'
            };
        }

        const state = interaction.client.modulesManager.enabled(
            interaction.guildId,
            Module(command.options.name as any)
        );
        if (!state) {
            return {
                ok: false,
                type: 'chatInput',
                interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: Module(command.options.name as any)
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

        const state = interaction.client.modulesManager.enabled(
            interaction.guildId,
            Module(command.options.name as any)
        );
        if (!state)
            return {
                ok: false,
                type: 'userContextMenu',
                contextMenu: interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: Module(command.options.name as any)
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

        const state = interaction.client.modulesManager.enabled(
            interaction.guildId,
            Module(command.options.name as any)
        );
        if (!state)
            return {
                ok: false,
                type: 'userContextMenu',
                contextMenu: interaction,
                metadata: {
                    replyKey: 'moduleDisabled',
                    guild: interaction.guild,
                    module: Module(command.options.name as any)
                }
            };
        return {
            ok: true,
            type: 'userContextMenu',
            contextMenu: interaction
        };
    });
