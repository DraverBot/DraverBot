import { AmethystEvent } from 'amethystjs';
import { CoinsManager } from 'coins-manager';
import { ModulesManager } from '../managers/modulesManager';
import { checkDatabase } from '../utils/functions';
import { database } from '../utils/query';
import { InterserverManager } from 'interserver-manager';

export default new AmethystEvent('ready', async (client) => {
    await checkDatabase();

    // Init managers
    client.modulesManager = new ModulesManager();
    client.coinsManager = new CoinsManager(database, {
        type: 'multiguild'
    })
    client.interserver = new InterserverManager(client, database);

    // Start managers
    client.coinsManager.start();
    client.interserver.start();
});

declare module 'discord.js' {
    interface Client {
        modulesManager: ModulesManager;
        coinsManager: CoinsManager<'multiguild'>;
        interserver: InterserverManager;
    }
}
