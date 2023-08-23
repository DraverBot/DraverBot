import { BaseInteraction, Collection, Guild } from 'discord.js';
import { levelsList } from '../typings/managers';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';

type GuildResolvable = string | Guild | BaseInteraction;
export class LevelsListManager {
    private _cache: Collection<string, levelsList> = new Collection();

    constructor() {
        this.init();
    }

    public get cache() {
        return this._cache;
    }
    public getId(guild: GuildResolvable) {
        return typeof guild === 'string' ? guild : guild instanceof Guild ? guild.id : guild.guild.id;
    }
    public getLists(guild: GuildResolvable) {
        return this._cache.get(this.getId(guild)) ?? { guild_id: this.getId(guild), wl: [], bl: [] };
    }
    public addList(guild: GuildResolvable, list: 'wl' | 'bl', item: string) {
        const id = this.getId(guild);
        const lists = this.getLists(id);

        if (!lists[list].includes(item)) lists[list].push(item);

        this._cache.set(id, lists);
        query(this.buildQuery(id));
    }
    public removeList(guild: GuildResolvable, list: 'wl' | 'bl', item: string) {
        const id = this.getId(guild);
        const lists = this.getLists(id);

        if (lists[list].includes(item)) lists[list] = lists[list].filter((x) => x !== item);

        this._cache.set(id, lists);
        query(this.buildQuery(id));
    }
    public swap(guild: GuildResolvable) {
        const data = this.getLists(guild);

        const { wl, bl } = data;
        data.bl = wl;
        data.wl = bl;

        this._cache.set(data.guild_id, data);
        query(this.buildQuery(this.getId(guild)));
    }
    public purge(guild: GuildResolvable, list: 'bl' | 'wl') {
        const id = this.getId(guild);
        const data = this.getLists(id);

        data[list] = [];

        this._cache.set(id, data);

        query(this.buildQuery(id));
    }
    public setList(guild: GuildResolvable, list: string[]) {
        const id = this.getId(guild);
        const configured = this.getConfigured(id);
        const data = this.getLists(guild);

        data[configured] = list;

        this._cache.set(id, data);

        query(this.buildQuery(id));
    }
    public getConfigured(guild: GuildResolvable) {
        const data = this.getLists(guild);

        if (data.bl.length > 0) return 'bl';
        if (data.wl.length > 0) return 'wl';
        return null;
    }

    private buildQuery(id: string) {
        const data = this.getLists(id);

        return `INSERT INTO ${DatabaseTables.LevelsList} ( guild_id, wl, bl ) VALUES ( '${
            data.guild_id
        }', '${JSON.stringify(data.wl)}', '${JSON.stringify(data.bl)}' ) ON DUPLICATE KEY UPDATE bl='${JSON.stringify(
            data.bl
        )}', wl='${JSON.stringify(data.wl)}'`;
    }
    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.LevelsList} ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, wl LONGTEXT, bl LONGTEXT )`
        );
        return true;
    }
    private async fillCache() {
        const datas = await query<levelsList<true>>(`SELECT * FROM ${DatabaseTables.LevelsList}`);

        datas.forEach((x) => {
            this._cache.set(x.guild_id, {
                ...x,
                wl: JSON.parse(x.wl),
                bl: JSON.parse(x.bl)
            });
        });
    }
    private async init() {
        await this.checkDb();
        this.fillCache();
    }
}
