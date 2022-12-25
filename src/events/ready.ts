import { AmethystEvent } from 'amethystjs';
import BlaguesAPI from 'blagues-api';
import { CoinsManager } from 'coins-manager';
import { ConfigsManager } from '../managers/configsManager';
import { InterserverManager } from '../managers/interserverManager';
import { LevelsManager } from '../managers/levelsManager';
import { ModulesManager } from '../managers/modulesManager';
import { checkDatabase, util } from '../utils/functions';
import { database } from '../utils/query';
import { GiveawayManager } from 'discordjs-giveaways';
import { giveawayButtons, giveawayEmbeds } from '../data/giveaway';
import { existsSync, mkdirSync } from 'fs';
import { TicketsManager } from '../managers/ticketsManager';
import { ActivityOptions, ActivityType } from 'discord.js';
import { numerize, random } from '../utils/toolbox';
import { CooldownsManager } from '../managers/cooldownsManager';

export default new AmethystEvent('ready', async (client) => {
    if (!existsSync('./saves/')) mkdirSync('./saves');
    await checkDatabase();

    client.modulesManager = new ModulesManager();

    client.coinsManager = new CoinsManager(database, {
        type: 'multiguild'
    });
    client.levelsManager = new LevelsManager(client);
    client.interserver = new InterserverManager(client);
    client.configsManager = new ConfigsManager();
    client.ticketsManager = new TicketsManager(client);
    client.blagues = new BlaguesAPI(process.env.BLAGUES_API_TOKEN);
    client.giveaways = new GiveawayManager(client, database, {
        sendMessages: false,
        embeds: giveawayEmbeds,
        buttons: giveawayButtons
    });
    client.cooldownsManager = new CooldownsManager();

    // Start managers
    client.coinsManager.start();
    client.giveaways.start();

    const activities: (() => Promise<ActivityOptions>)[] = [
        async () => {
            await client.guilds.fetch();
            const count = client.guilds.cache.map((x) => x.memberCount).reduce((a, b) => a + b);

            return {
                name: `${numerize(count)} utilisateurs`,
                type: ActivityType.Watching
            };
        },
        async () => {
            return {
                name: `${numerize(client.guilds.cache.size)} serveurs`,
                type: ActivityType.Watching
            };
        },
        async () => {
            return {
                name: `de la musique Lofi`,
                type: ActivityType.Listening,
                url: [
                    util('lofiGirl'),
                    'https://discord.com/api/oauth2/authorize?client_id=1037028318404419596&permissions=2184464640&scope=bot%20applications.commands'
                ][random({ max: 2 })] as string
            };
        }
    ];
    let activitiesCount = 0;

    const updateActivity = async () => {
        client.user.setActivity(await activities[activitiesCount]());
        activitiesCount++;
    };
    updateActivity();

    setInterval(updateActivity, 20000);
});
