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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { TicketsManager } from '../managers/ticketsManager';
import { ActivityOptions, ActivityType, TextChannel } from 'discord.js';
import { basicEmbed, buildButton, numerize, random, row, sendError } from '../utils/toolbox';
import { CooldownsManager } from '../managers/cooldownsManager';
import { RemindsManager } from '../managers/remindsManager';

export default new AmethystEvent('ready', async (client) => {
    if (!existsSync('./saves/')) mkdirSync('./saves');
    if (!existsSync(`./dist/data/sqllogs.json`)) writeFileSync(`./dist/data/sqllogs.json`, JSON.stringify([]));

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
    client.RemindsManager = new RemindsManager(client);

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
                name: `Lofi Girl`,
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
        client.user.setActivity(await activities[activitiesCount % activities.length]());
        activitiesCount++;
    };
    updateActivity();

    const loadpanel = async () => {
        const channel = client.channels.cache.get(
            client.user.username.includes(' ') ? '1062732662655176835' : '1062732142527918090'
        ) as TextChannel;
        if (!channel) return;

        await channel.bulkDelete(100, true).catch(console.log);

        const msg = await channel
            .send({
                embeds: [
                    basicEmbed(client.user, { draverColor: true })
                        .setTitle('Panel')
                        .setDescription(`Panel de <@${client.user.id}>`)
                        .setImage('attachment://banner.png')
                ],
                components: [
                    row(
                        buildButton({
                            label: `Télécharger les erreurs SQL`,
                            buttonId: 'DownloadSqlLogs',
                            style: 'Primary'
                        }),
                        buildButton({
                            label: 'Analyser les logs SQL',
                            buttonId: 'AnalyzeSqlLogs',
                            style: 'Secondary'
                        }),
                        buildButton({
                            label: 'Informations instantanées',
                            buttonId: 'DevInstantInfos',
                            style: 'Secondary'
                        }),
                        buildButton({
                            label: 'Effacer les logs SQL',
                            buttonId: 'ClearSqlLogs',
                            style: 'Danger'
                        })
                    ),
                    row(
                        buildButton({
                            label: 'Liste des GBan',
                            style: 'Primary',
                            buttonId: 'GBanList'
                        }),
                        buildButton({
                            label: 'GBannir un utilisateur',
                            buttonId: 'GBanUser',
                            style: 'Success'
                        }),
                        buildButton({
                            label: 'UnGBannir un utilisateur',
                            buttonId: 'UnGBanUser',
                            style: 'Danger'
                        })
                    )
                ],
                files: ['./images/banner.png']
            })
            .catch(sendError);
        if (msg && msg.pinnable) msg.pin().catch(sendError);
    };
    loadpanel();

    setInterval(updateActivity, 20000);
});

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
