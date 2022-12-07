import { AmethystClient } from "amethystjs";
import { Partials } from "discord.js";
import { config } from "dotenv";

config();

const client = new AmethystClient({
    intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
    partials: [Partials.GuildMember]
}, {
    token: process.env.token,
    eventsFolder: './dist/events',
    commandsFolder: './dist/commands',
    preconditionsFolder: './dist/preconditions',
    autocompleteListenersFolder: './dist/autocompletes',
    debug: true,
    defaultCooldownTime: 5
})

client.start({});