import { Precondition } from 'amethystjs';
import { Module } from '../utils/functions';

export default new Precondition('moduleEnabled').setChatInputRun(({ command, interaction }) => {
    if (!interaction.guild) {
        return {
            ok: true,
            interaction,
            isChatInput: true
        };
    }

    const state = interaction.client.modulesManager.enabled(interaction.guildId, Module(command.options.name as any));
    if (!state) {
        return {
            ok: false,
            isChatInput: true,
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
        isChatInput: true,
        interaction
    };
});
