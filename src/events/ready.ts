import { AmethystEvent } from 'amethystjs';
import BlaguesAPI from 'blagues-api';
import { CoinsManager } from 'coins-manager';
import { ConfigsManager } from '../managers/configsManager';
import { InterserverManager } from '../managers/interserverManager';
import { LevelsManager } from '../managers/levelsManager';
import { ModulesManager } from '../managers/modulesManager';
import { checkDatabase } from '../utils/functions';
import { database } from '../utils/query';

export default new AmethystEvent('ready', async (client) => {
    await checkDatabase();

    // Init managers
    client.modulesManager = new ModulesManager();
    client.coinsManager = new CoinsManager(database, {
        type: 'multiguild'
    });
    client.levelsManager = new LevelsManager(client);
    client.interserver = new InterserverManager(client);
    client.configsManager = new ConfigsManager();
    client.blagues = new BlaguesAPI(process.env.BLAGUES_API_TOKEN);

    // Start managers
    client.coinsManager.start();
});

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
