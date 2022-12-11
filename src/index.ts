import { AmethystClient } from 'amethystjs';
import { Partials } from 'discord.js';
import { config } from 'dotenv';

config();

const client = new AmethystClient(
    {
        intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
        partials: [Partials.GuildMember, Partials.Message]
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
