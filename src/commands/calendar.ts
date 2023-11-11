import { log4js } from 'amethystjs';
import { calendar } from '../cache/christmas';
import dev from '../preconditions/dev';
import axios from 'axios';
import { DraverCommand } from '../structures/DraverCommand';

export default new DraverCommand({
    name: 'calendrier',
    description: 'Ouvre le calendrier',
    preconditions: [dev],
    module: 'fun'
})
    .setChatInputRun(async ({ interaction }) => {
        const rep = calendar.open(interaction.user.id);

        if (rep === 'no day')
            return interaction
                .reply({
                    content: `Désolé, il n'y as pas de cadeau pour aujourd'hui, réessayez plus tard :(`,
                    ephemeral: true
                })
                .catch(log4js.trace);

        if (rep === 'already claimed')
            return interaction
                .reply({
                    content: `Vous avez déjà récupéré le cadeau du jour`,
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                content: `🎁 | Vous avez récupéré **${calendar.today?.reward}**`,
                ephemeral: true
            })
            .catch(log4js.trace);
    })
    .setMessageRun(async ({ message }) => {
        const file = message.attachments.first();
        if (!file || !file.contentType.includes('application/json'))
            return message.reply(":x: | Vous n'avez pas envoyé de fichier json valide").catch(log4js.trace);

        const content = await axios(file.url).catch(log4js.trace);
        if (!content)
            return message.reply(`:x: | Je n'ai pas pu télécharger le contenu de votre fichier`).catch(log4js.trace);

        const rep = calendar.importFrom(content.data);
        if (rep === 'already defined') return message.reply(`:x: | Les jours sont déjà définis`).catch(log4js.trace);
        if (rep === 'not array') return message.reply(`:x: | Ce n'est pas un tableau JSON valide`).catch(log4js.trace);
        if (rep === 'not 24')
            return message.reply(`:x: | Le tableau n'a pas une longueur de 24 éléments`).catch(log4js.trace);
        if (rep === 'duplicate entries') return message.reply(`:x: | Des jours sont dupliqués`).catch(log4js.trace);

        message.reply(`:white_check_mark: | Les récompenses ont été définies`).catch(log4js.trace);
    });
