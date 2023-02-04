import { AmethystClient } from 'amethystjs';
import { Partials } from 'discord.js';
import { config } from 'dotenv';

config();

const client = new AmethystClient(
    {
        intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
        partials: [Partials.GuildMember, Partials.Message, Partials.Channel]
    },
    {
        token: process.env.token,
        eventsFolder: './dist/events',
        commandsFolder: './dist/commands',
        preconditionsFolder: './dist/preconditions',
        autocompleteListenersFolder: './dist/autocompletes',
        buttonsFolder: './dist/buttons',
        debug: true,
        defaultCooldownTime: 5,
        prefix: '!!'
    }
);

client.start({});

declare module 'amethystjs' {
    interface AmethystCommand {
        module: string;
    }
    interface commandOptions {
        module: string;
    }
}

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
