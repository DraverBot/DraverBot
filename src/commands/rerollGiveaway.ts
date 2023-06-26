import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed } from '../utils/toolbox';
import replies from '../data/replies';
import { GuildMember } from 'discord.js';

export default new AmethystCommand({
    name: 'Reroll le giveaway',
    description: 'Reroll le giveaway',
    permissions: ['ManageGuild'],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setMessageContextRun(async ({ interaction, message, client }) => {
    if (!client.giveaways.fetchGiveaway(message.id, true))
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
    const reroll = await client.giveaways.reroll(message.id);
    if (typeof reroll === 'string')
        return interaction
            .editReply({ embeds: [replies.internalError(interaction.member as GuildMember)] })
            .catch(log4js.trace);
    interaction.deleteReply().catch(log4js.trace);
});
