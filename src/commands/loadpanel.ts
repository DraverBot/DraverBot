import { AmethystCommand } from 'amethystjs';
import { TextChannel } from 'discord.js';
import { basicEmbed, row, buildButton } from '../utils/toolbox';
import dev from '../preconditions/dev';

export default new AmethystCommand({
    name: 'loadpanel',
    description: 'Load the panel',
    preconditions: [dev]
}).setMessageRun(({ message }) => {
    (message.channel as TextChannel).bulkDelete(100, true).catch(console.log);

    message.channel
        .send({
            embeds: [
                basicEmbed(message.client.user, { draverColor: true })
                    .setTitle('Panel')
                    .setDescription(`Panel de <@${message.client.user.id}>`)
            ],
            components: [
                row(
                    buildButton({
                        label: `Télécharher les erreurs SQL`,
                        buttonId: 'DownloadSqlLogs',
                        style: 'Secondary'
                    })
                )
            ]
        })
        .catch(console.log);
});
