import { giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import replies from '../../data/replies';
import { basicEmbed } from '../../utils/toolbox';
import { GuildMember } from 'discord.js';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.giveaway.end'),
    module: 'giveaways',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild']
}).setMessageContextRun(async ({ interaction, message }) => {
    if (!giveaways.fetchGiveaway(message.id))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle(translator.translate('commands.giveaway.end.replies.invalid.title', interaction))
                        .setDescription(translator.translate('commands.giveaway.end.replies.invalid.description', interaction))
                ],
                ephemeral: true
            })
            .catch(log4js.trace);

    await interaction.deferReply({ ephemeral: true }).catch(log4js.trace);
    const gw = await giveaways.endGiveaway(message.id);

    if (typeof gw === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember, interaction)] })
            .catch(log4js.trace);
    interaction.deleteReply().catch(log4js.trace);
});
