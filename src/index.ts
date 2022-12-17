import { AmethystClient } from 'amethystjs';
import BlaguesAPI from 'blagues-api';
import { CoinsManager } from 'coins-manager';
import { Partials } from 'discord.js';
import { config } from 'dotenv';
import { ConfigsManager } from './managers/configsManager';
import { InterserverManager } from './managers/interserverManager';
import { LevelsManager } from './managers/levelsManager';
import { ModulesManager } from './managers/modulesManager';
import { checkDatabase } from './utils/functions';
import { database } from './utils/query';

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
declare module 'discord.js' {
    interface Client {
        modulesManager: ModulesManager;
        coinsManager: CoinsManager<'multiguild'>;
        interserver: InterserverManager;
        levelsManager: LevelsManager;
        configsManager: ConfigsManager;
        blagues: BlaguesAPI;
    }
}
