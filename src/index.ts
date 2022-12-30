import { AmethystClient } from 'amethystjs';
import BlaguesAPI from 'blagues-api';
import { CoinsManager } from 'coins-manager';
import { Partials } from 'discord.js';
import { config } from 'dotenv';
import { ConfigsManager } from './managers/configsManager';
import { InterserverManager } from './managers/interserverManager';
import { LevelsManager } from './managers/levelsManager';
import { ModulesManager } from './managers/modulesManager';
import { GiveawayManager } from 'discordjs-giveaways';
import { TicketsManager } from './managers/ticketsManager';
import { CooldownsManager } from './managers/cooldownsManager';
import { RemindsManager } from './managers/remindsManager';

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
        giveaways: GiveawayManager;
        ticketsManager: TicketsManager;
        cooldownsManager: CooldownsManager;
        RemindsManager: RemindsManager;
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
