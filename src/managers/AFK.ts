import { log4js } from 'amethystjs';
import { DatabaseTables, afk } from '../typings/database';
import query from '../utils/query';
import { Collection } from 'discord.js';
import { sqliseString } from '../utils/toolbox';

export class AFKManager {
    private cache: Collection<string, afk> = new Collection();

    constructor() {
        this.start();
    }

    public setAFK(user: string, reason: string) {
        const at = Date.now();
        this.cache.set(user, {
            reason,
            user_id: user,
            afkat: at
        });

        query(
            `INSERT INTO ${DatabaseTables.AFK} ( user_id, reason, afkat ) VALUES ("${user}", "${sqliseString(
                reason
            )}", "${at}") ON DUPLICATE KEY UPDATE reason="${sqliseString(reason)}", afkat="${at}"`
        ).catch(log4js.trace);
    }
    public isAFK(user: string): [boolean, afk] {
        return [this.cache.has(user), this.cache.get(user)];
    }
    public removeAFK(user: string) {
        this.cache.delete(user);

        query(`DELETE FROM ${DatabaseTables.AFK} WHERE user_id="${user}"`).catch(log4js.trace);
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.AFK} ( user_id VARCHAR(255) NOT NULL PRIMARY KEY, reason VARCHAR(255) NOT NULL, afkat VARCHAR(255) NOT NULL )`
        ).catch(log4js.trace);
        return true;
    }
    private async fillCache() {
        const datas = await query<afk<true>>(`SELECT * FROM ${DatabaseTables.AFK}`).catch(log4js.trace);
        if (!datas) return log4js.trace('Pas de données pour le manager AFK');

        this.cache = new Collection(datas.map((d) => [d.user_id, { ...d, afkat: parseInt(d.afkat) }] as [string, afk]));
    }
    private async start() {
        await this.checkDb();
        this.fillCache();
    }
}
