import { AmethystEvent } from 'amethystjs';
import BlaguesAPI from 'blagues-api';
import { CoinsManager } from 'coins-manager';
import { ConfigsManager } from '../managers/configsManager';
import { InterserverManager } from '../managers/interserverManager';
import { LevelsManager } from '../managers/levelsManager';
import { ModulesManager } from '../managers/modulesManager';
import { checkDatabase } from '../utils/functions';
import { database } from '../utils/query';
import { GiveawayManager } from 'discordjs-giveaways';
import { giveawayButtons, giveawayEmbeds } from '../data/giveaway';

export default new AmethystEvent('ready', (client) => {
    checkDatabase();
    client.modulesManager = new ModulesManager();

    client.coinsManager = new CoinsManager(database, {
        type: 'multiguild'
    });
    client.levelsManager = new LevelsManager(client);
    client.interserver = new InterserverManager(client);
    client.configsManager = new ConfigsManager();
    client.blagues = new BlaguesAPI(process.env.BLAGUES_API_TOKEN);
    client.giveaways = new GiveawayManager(client, database, {
        sendMessages: false,
        embeds: giveawayEmbeds,
        buttons: giveawayButtons
    });

    // Start managers
    client.coinsManager.start();
    client.giveaways.start();
});
