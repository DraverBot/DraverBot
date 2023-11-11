import { DraverCommand } from '../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import replies from '../data/replies';
import { basicEmbed } from '../utils/toolbox';
import { GuildMember } from 'discord.js';

export default new DraverCommand({
    name: 'Terminer le giveaway',
    module: 'giveaways',
    description: 'Termine le giveaway',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild']
}).setMessageContextRun(async ({ interaction, message, client }) => {
    if (!client.giveaways.fetchGiveaway(message.id))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Giveaway invalide')
                        .setDescription(`Ce n'est pas un giveaway`)
                ],
                ephemeral: true
            })
            .catch(log4js.trace);

    await interaction.deferReply({ ephemeral: true }).catch(log4js.trace);
    const gw = await client.giveaways.endGiveaway(message.id);

    if (typeof gw === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember)] })
            .catch(log4js.trace);
    interaction.deleteReply().catch(log4js.trace);
});
