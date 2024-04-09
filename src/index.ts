import { AmethystClient, DebugImportance, log4js } from 'amethystjs';
import { EmbedBuilder, Partials, WebhookClient } from 'discord.js';
import { config } from 'dotenv';
import { TranslateError } from './translate/structs/TranslateError';

config();

const client = new AmethystClient(
    {
        intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent', 'GuildVoiceStates'],
        partials: [Partials.GuildMember, Partials.Message, Partials.Channel]
    },
    {
        token: process.env.token,
        eventsFolder: './dist/events',
        commandsFolder: './dist/commands',
        preconditionsFolder: './dist/preconditions',
        autocompleteListenersFolder: './dist/autocompletes',
        buttonsFolder: './dist/buttons',
        commandsArchitecture: 'double',
        debug: true,
        defaultCooldownTime: 5,
        prefix: '!!'
    }
);

client.start({});
log4js.config('onLog', () => client.debug('Got a Log4JS log', DebugImportance.Unexpected));

if (process.env.password?.length > 1) {
    const webhook = new WebhookClient({
        url: process.env.translateErrorWebhook
    })
    const logError = (error: TranslateError) => {
        if (webhook) {
            webhook.send({
                embeds: [new EmbedBuilder().setTimestamp().setFooter({ text: 'Translate error' }).setColor('Red').setTitle("Translate error").setFields({
                    name: 'Message',
                    value: error.message
                }).setDescription(`Langue : \`${error.data.lang}\`\nChemin complet: \`${error.data.full}\`\nCaractère invalide: \`${error.data.erroring}\``)
            ]
            }).catch(log4js.trace)
        }
    }

    process.on('uncaughtException', (error, listener) => {
        if (error instanceof TranslateError) {
            logError(error)
        }
        console.log(`Error: ${error} at ${listener} listener`);
    });
    process.on('uncaughtExceptionMonitor', (error, origin) => {
        console.log(`Error: ${error} at ${origin}`);
    });
    process.on('unhandledRejection', (error, promise) => {
        if (error instanceof TranslateError) {
            logError(error)
        }
        console.log(`Error: ${error} at ${JSON.stringify(promise, null, 4)}`);
    });
}
export { client };
