import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed } from '../utils/toolbox';
import replies from '../data/replies';
import GetCountersConfig from '../process/GetCountersConfig';

export default new AmethystCommand({
    name: 'compteurs',
    description: 'Configure les compteurs',
    preconditions: [preconditions.GuildOnly],
    permissions: ['Administrator'],
    clientPermissions: ['ManageChannels'],
    options: [
        {
            name: 'activer',
            description: 'Active les compteurs',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'désactiver',
            description: 'Désactive les compteurs',
            type: ApplicationCommandOptionType.Subcommand
        }
    ]
}).setChatInputRun(async ({ interaction, options, client }) => {
    const cmd = options.getSubcommand();
    if (!client.configsManager.getValue(interaction.guild.id, 'counters_enabled'))
        return interaction
            .reply({
                embeds: [replies.configDisabled(interaction.user, 'counters_enabled')],
                ephemeral: true
            })
            .catch(log4js.trace);

    if (cmd === 'activer') {
        if (client.counters.cache.get(interaction.guild.id))
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Déjà activé')
                        .setDescription(`Les compteurs sont déjà configurés`)
                ]
            });
        const config = await GetCountersConfig.process({
            interaction,
            user: interaction.user
        }).catch(log4js.trace);
    }
});
