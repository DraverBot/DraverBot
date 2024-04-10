import { Precondition } from 'amethystjs';
import ms from 'ms';
import replies from '../data/replies';
import { GuildMember } from 'discord.js';
import { sendError } from '../utils/toolbox';

export default new Precondition('validTime').setChatInputRun(({ interaction, options }) => {
    const time = options.getString('temps') || options.getString('durée');
    if (!time)
        return {
            ok: true,
            interaction,
            type: 'chatInput'
        };
    if (!ms(time)) {
        interaction
            .reply({
                embeds: [replies.invalidTime((interaction?.member as GuildMember) ?? interaction.user, interaction)],
                ephemeral: true
            })
            .catch(sendError);
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
