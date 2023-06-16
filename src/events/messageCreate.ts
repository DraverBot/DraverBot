import { AmethystEvent } from 'amethystjs';
import splashes from '../data/splash.json';
import { util } from '../utils/functions';
import { basicEmbed, random, sendError } from '../utils/toolbox';

export default new AmethystEvent('messageCreate', (message) => {
    if (message.author.bot || message.webhookId) return;

    if (
        message.mentions.has(message.client.user.id) &&
        (!!message.guild ? !!message.client.configsManager.getValue(message.guild.id, 'mention_message') : true)
    ) {
        if (message.content.length < 100) {
            let available = splashes.filter(
                (x) =>
                    ![
                        "This splash text will never appear. Isn't that weird ?",
                        '1 chance out of 10 000',
                        'Easter egg :)'
                    ].includes(x)
            );
            if (random({ max: 10000 }) === 156) {
                available.push('1 chance out of 10 000');
            }
            if (random({ max: 200 }) === 58) {
                available.push('Easter egg :)');
            }

            available = available.map((item) => {
                item = item.replace('{size}', splashes.length.toString());

                return item;
            });
            const splashEmbed = basicEmbed(message.author, { draverColor: true });
            let splash = available[random({ max: available.length })];

            if (splash.includes('-rr')) {
                splashEmbed.setURL(util('rickroll'));
                splash = splash.replace('-rr', '');
            }
            if (splash.includes('-lg')) {
                splashEmbed.setURL(util('lofiGirl'));
                splash = splash.replace('-lg', '');
            }
            const Draver = () => {
                if (random({ max: 10000 }) === 568) return 'Drevar';
                return 'Draver';
            };
            splashEmbed
                .setTitle(splash)
                .setImage('attachment://banner.png')
                .setAuthor({ name: Draver() })
                .setDescription(
                    `Bonjour, je suis Draver, un bot Discord francophone [open source](https://github.com/DraverBot/DraverBot):flag_fr:\nSi tu as besoin de moi, utilise mes slash commandes (disponibles en tapant \`/\` dans le chat)\n\nSi vous avez besoin d'aide, [mon serveur de support](${util(
                        'support'
                    )}) se fera un plaisir de vous aider`
                );

            message.channel.send({
                embeds: [splashEmbed],
                files: ['./images/banner.png']
            });
        }
    }
    if (/web {0,}driver {0,}torso/i.test(message.content)) {
        message.channel
            .send({
                reply: {
                    messageReference: message
                },
                content: util('webdrivertorso')
            })
            .catch(sendError);
    }
    if (/rick {0,}roll/i.test(message.content)) {
        message.reply(`<${util('rickroll')}>`).catch(sendError);
    }
    if (/coffin {0,}dance/i.test(message.content)) {
        message.reply(util('coffindance')).catch(sendError);
    }
    if (
        message.guild &&
        ['Dinnerbone', 'Grumm'].includes(message.guild.members.me?.nickname) &&
        random({ max: 200 }) === 26
    ) {
        const reverse = (str) => {
            let x = '';
            for (const c of str) {
                x = c + x;
            }
            return x;
        };

        message.reply(reverse(`C'est le monde à l'envers 🙃`)).catch(sendError);
    }
});
