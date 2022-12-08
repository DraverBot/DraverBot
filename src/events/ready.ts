import { AmethystEvent } from 'amethystjs';
import { CoinsManager } from 'coins-manager';
import { ModulesManager } from '../managers/modulesManager';
import { checkDatabase } from '../utils/functions';
import { database } from '../utils/query';

export default new AmethystEvent('ready', async (client) => {
    await checkDatabase();

    // Init managers
    client.modulesManager = new ModulesManager();
    client.coinsManager = new CoinsManager(database, {
        type: 'multiguild'
    })

    // Start managers
    client.coinsManager.start();
});

declare module 'discord.js' {
    interface Client {
        modulesManager: ModulesManager;
        coinsManager: CoinsManager<'multiguild'>;
    }
}
