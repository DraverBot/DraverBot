import { giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed } from '../../utils/toolbox';
import replies from '../../data/replies';
import { GuildMember } from 'discord.js';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.giveaway.reroll'),
    module: 'giveaways',
    permissions: ['ManageGuild'],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setMessageContextRun(async ({ interaction, message, client }) => {
    if (!giveaways.fetchGiveaway(message.id, true))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle(translator.translate('commands.admins.reroll.invalid.title', interaction))
                        .setDescription(translator.translate('commands.admins.reroll.invalid.description', interaction))
                ],
                ephemeral: true
            })
            .catch(log4js.trace);

    await interaction.deferReply({ ephemeral: true }).catch(log4js.trace);
    const reroll = await giveaways.reroll(message.id);
    if (typeof reroll === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember, interaction)] })
            .catch(log4js.trace);
    interaction.deleteReply().catch(log4js.trace);
});
