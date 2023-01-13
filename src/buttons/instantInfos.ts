import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { basicEmbed, numerize, secondsToWeeks } from '../utils/toolbox';
import { Status } from 'discord.js';
const { version, dependencies } = require('../../package.json');

export default new ButtonHandler({
    customId: ButtonIds.DevInstantInfos,
    preconditions: [dev]
}).setRun(async ({ button }) => {
    await button
        .deferReply({
            ephemeral: true
        })
        .catch(() => {});

    button
        .editReply({
            embeds: [
                basicEmbed(button.user, { draverColor: true })
                    .setTitle('Informations instantannées')
                    .setDescription(
                        `Voici les informations instantannées de ${
                            button.client.user
                        }\n\n**Version :** \`${version}\`\n**Uptime :** ${secondsToWeeks(
                            Math.floor(button.client.uptime / 1000)
                        )}\n**Serveurs :** ${numerize(button.client.guilds.cache.size)} (environ)`
                    )
                    .setFields(
                        {
                            name: 'Processus',
                            value: numerize(process.memoryUsage().heapTotal),
                            inline: true
                        },
                        {
                            name: 'Dépendences',
                            value: Object.keys(dependencies)
                                .map((x) => `\`${x}@${dependencies[x]}\``)
                                .join(' '),
                            inline: true
                        },
                        {
                            name: 'Latence',
                            value: `Client: \`${numerize(button.client.ws.ping)}\` ms\nTemps de réponse: \`${numerize(
                                button.createdTimestamp - Date.now()
                            )}\` ms\nClient WS status: ${Status[button.client.ws.status]}`,
                            inline: false
                        }
                    )
            ]
        })
        .catch(console.log);
});
