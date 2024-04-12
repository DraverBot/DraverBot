import { giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, confirm } from '../../utils/toolbox';
import replies from '../../data/replies';
import { GuildMember } from 'discord.js';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.giveaway.delete'),
    module: 'giveaways',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild']
}).setMessageContextRun(async ({ interaction, message, client }) => {
    if (!giveaways.fetchGiveaway(message.id))
        return interaction
            .reply({
                ephemeral: true,
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle(translator.translate('commands.giveaway.delete.replies.invalid.title', interaction))
                        .setDescription(translator.translate('commands.giveaway.delete.replies.invalid.description', interaction))
                ]
            })
            .catch(log4js.trace);

    const confirmation = await confirm({
        interaction,
        user: interaction.user,
        embed: basicEmbed(interaction.user)
            .setTitle(translator.translate('commands.giveaway.delete.replies.confirm.title', interaction))
            .setDescription(translator.translate('commands.giveaway.delete.replies.confirm.description', interaction)),
        ephemeral: true
    }).catch(log4js.trace);

    if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
        return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
    await confirmation.interaction.deferUpdate().catch(log4js.trace);

    const deletion = giveaways.deleteGiveaway(message.id).catch(log4js.trace);
    if (typeof deletion === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember, confirmation.interaction)] })
            .catch(log4js.trace);

    interaction.deleteReply().catch(log4js.trace);
});
