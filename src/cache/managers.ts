import { CoinsManager } from 'coins-manager';
import { ModulesManager } from '../managers/modulesManager';
import { database } from '../utils/query';
import { LevelsManager } from '../managers/levelsManager';
import { client } from '../index';
import { InterserverManager } from '../managers/interserverManager';
import { ConfigsManager } from '../managers/configsManager';
import { TicketsManager } from '../managers/ticketsManager';
import BlaguesAPI from 'blagues-api';
import { GiveawayManager } from '../managers/GiveawayManager';
import { giveawayButtons, giveawayEmbeds } from '../data/giveaway';
import { Client } from 'discord.js';
import { CooldownsManager } from '../managers/cooldownsManager';
import { RemindsManager as Reminder } from '../managers/remindsManager';
import { AnonymousManager as Anonymous } from '../managers/Anonymous';
import { GBanSystem } from '../managers/GBanSystem';
import { ShopManager } from '../managers/Shop';
import { PasswordManager } from '../managers/PasswordManager';
import { LotoManager } from '../managers/LotoManager';
import { PollsManager } from '../managers/pollsManager';
import { PlugboardsManager } from '../managers/PlugboardManager';
import { TaskManager } from '../managers/TaskManager';
import { RolesReactManager } from '../managers/RoleReactsManager';
import { LevelsListManager } from '../managers/LevelListManager';
import { TempChannelsManager } from '../managers/TempChannelsManager';
import { InvitesManager } from '../managers/InvitesManager';
import { AFKManager } from '../managers/AFK';
import { LevelsRewards } from '../managers/LevelsRewards';
import { CountersManager } from '../managers/Counters';

const cl = client as unknown as Client;

const modulesManager = new ModulesManager();
const coinsManager = new CoinsManager(database, {
    type: 'multiguild'
});
const levelsManager = new LevelsManager(cl);
const interserver = new InterserverManager(cl);
const configsManager = new ConfigsManager();
const ticketsManager = new TicketsManager(cl);
const blagues = new BlaguesAPI(process.env.BLAGUES_API_TOKEN);
const giveaways = new GiveawayManager(
    cl,
    {
        mode: 'mysql',
        connection: database
    },
    {
        sendMessages: false,
        embeds: giveawayEmbeds,
        buttons: giveawayButtons
    }
);
const cooldownsManager = new CooldownsManager();
const RemindsManager = new Reminder(cl);
const AnonymousManager = new Anonymous(cl);
const GBan = new GBanSystem();
const shop = new ShopManager(coinsManager);
const passwords = new PasswordManager();
const lotoManager = new LotoManager(cl);
const pollsManager = new PollsManager(cl);
const plugboardsManager = new PlugboardsManager();
const tasksManager = new TaskManager(cl);
const rolesReact = new RolesReactManager(cl);
const levelsChannels = new LevelsListManager();
const rewards = new LevelsRewards(cl);
const tempChannels = new TempChannelsManager(cl);
const invitesManager = new InvitesManager(cl);
const afk = new AFKManager();
const countersManager = new CountersManager(client);

giveaways.start();
coinsManager.start();

export {
    modulesManager,
    coinsManager,
    levelsManager,
    interserver,
    configsManager,
    ticketsManager,
    blagues,
    giveaways,
    cooldownsManager,
    RemindsManager,
    AnonymousManager,
    GBan,
    shop,
    passwords,
    lotoManager,
    pollsManager,
    plugboardsManager,
    tasksManager,
    rolesReact,
    levelsChannels,
    rewards,
    tempChannels,
    invitesManager,
    afk,
    countersManager
};
