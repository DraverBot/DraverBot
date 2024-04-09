import { giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, confirm } from '../../utils/toolbox';
import replies from '../../data/replies';
import { GuildMember } from 'discord.js';

export default new DraverCommand({
    name: 'Supprimer le giveaway',
    module: 'giveaways',
    description: 'Supprime le giveaway',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild']
}).setMessageContextRun(async ({ interaction, message, client }) => {
    if (!giveaways.fetchGiveaway(message.id))
        return interaction
            .reply({
                ephemeral: true,
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Giveaway invalide')
                        .setDescription(`Ce n'est pas un giveaway`)
                ]
            })
            .catch(log4js.trace);

    const confirmation = await confirm({
        interaction,
        user: interaction.user,
        embed: basicEmbed(interaction.user)
            .setTitle('Suppression')
            .setDescription(`Êtes vous sûr de supprimer ce giveaway ?`),
        ephemeral: true
    }).catch(log4js.trace);

    if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
        return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
    await confirmation.interaction.deferUpdate().catch(log4js.trace);

    const deletion = giveaways.deleteGiveaway(message.id).catch(log4js.trace);
    if (typeof deletion === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember)] })
            .catch(log4js.trace);

    interaction.deleteReply().catch(log4js.trace);
});
