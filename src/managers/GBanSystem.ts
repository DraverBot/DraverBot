import { DatabaseTables, GBan } from '../typings/database';
import query from '../utils/query';
import { sqliseString } from '../utils/toolbox';

export class GBanSystem {
    private _cache: GBan[] = [];
    constructor() {
        this.start();
    }

    public isGbanned(user_id: string): false | GBan {
        return this._cache.find((x) => x.user_id === user_id) ?? false;
    }
    public add({ reason, user }: { reason: string; user: string }) {
        if (this.isGbanned(user)) return true;
        const date = Date.now();
        this._cache.push({
            user_id: user,
            reason: reason,
            date: date.toString()
        });

        query(
            `INSERT INTO ${DatabaseTables.GBan} (user_id, reason, date) VALUES ('${user}', "${sqliseString(
                reason
            )}", "${date}")`
        );
        return true;
    }
    public remove(user: string) {
        if (!this.isGbanned(user)) return false;
        this._cache.splice(this._cache.indexOf(this._cache.find((x) => x.user_id === user)), 1);

        query(`DELETE FROM ${DatabaseTables.GBan} WHERE user_id='${user}'`);
        return true;
    }
    public get cache() {
        return this._cache;
    }

    private start() {
        this.fillCache();
    }
    private async fillCache() {
        this._cache = await query<GBan>(`SELECT * FROM ${DatabaseTables.GBan}`);
    }
}
