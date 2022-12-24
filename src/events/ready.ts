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
import { existsSync, mkdirSync } from 'fs';
import { TicketsManager } from '../managers/ticketsManager';
import { ActivityType } from 'discord.js';

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

    // Start managers
    client.coinsManager.start();
    client.giveaways.start();

    client.user.setActivity({
        name: `Mentionnez-moi pour afficher l'aide`,
        type: ActivityType.Playing
    });
});
