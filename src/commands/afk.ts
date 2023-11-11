import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed } from '../utils/toolbox';
import { log4js } from 'amethystjs';

export default new DraverCommand({
    name: 'afk',
    module: 'utils',
    description: 'Vous met en mode AFK',
    options: [
        {
            name: 'raison',
            description: 'Raison de votre AFK',
            required: true,
            type: ApplicationCommandOptionType.String,
            maxLength: 100
        }
    ],
    preconditions: [preconditions.GuildOnly]
}).setChatInputRun(async ({ interaction, options, client }) => {
    const reason = options.getString('raison');

    client.afk.setAFK(interaction.user.id, reason);

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('AFK')
                    .setDescription(
                        `Vous êtes maintenant afk pour la raison **${reason}**\n\nEnvoyez un message pour retirer le mode AFK`
                    )
            ],
            ephemeral: true
        })
        .catch(log4js.trace);
});
