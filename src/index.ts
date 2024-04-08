import { AmethystClient, DebugImportance, log4js } from 'amethystjs';
import { Partials } from 'discord.js';
import { config } from 'dotenv';

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
    process.on('uncaughtException', (error, listener) => {
        console.log(`Error: ${error} at ${listener} listener`);
    });
    process.on('uncaughtExceptionMonitor', (error, origin) => {
        console.log(`Error: ${error} at ${origin}`);
    });
    process.on('unhandledRejection', (error, promise) => {
        console.log(`Error: ${error} at ${promise}`);
    });
}
export { client };
