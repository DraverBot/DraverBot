import { Collection } from "discord.js";
import { configKeys, configsData } from "../data/configData";
import { configs } from "../typings/database";
import query from "../utils/query";
import { boolDb, notNull, sqliseString } from "../utils/toolbox";

export class ConfigsManager {
    private _cache: Collection<string, configs> = new Collection();

    constructor() {
        this.start();
    }
    public getValue<T extends string | number | boolean = string | number | boolean>(guild_id: string, config: keyof configs): T {
        if (!this._cache.has(guild_id)) return (config === 'guild_id' ? guild_id : configsData[config]?.default) as T;

        return this._cache.get(guild_id)[config] as T;
    }
    public async setValue<T extends keyof configKeys>(guild_id: string, config: T, value: configKeys[T]): Promise<configs> {
        const data = this._cache.get(guild_id) ?? this.getDefaultValue(guild_id);
        data[config] = value as string;

        this._cache.set(data.guild_id, data);
        await query(this.buildQuery(guild_id));
    
        return data;
    }

    private getDefaultValue(id: string): configs {
        const datas = {} as configs;
        Object.keys(configsData).forEach((key: keyof configKeys) => {
            datas[key as string] = configsData[key].default
        })

        datas.guild_id = id;
        return datas;
    }
    private buildQuery(guild_id: string) {
        const datas = this._cache.get(guild_id);

        return `REPLACE INTO configs (${Object.keys(datas).filter(x => notNull(datas[x])).join(', ')}) VALUES (${Object.keys(datas).map(x => datas[x]).filter(x => notNull(x)).map(x => `"${typeof x === 'boolean' ? boolDb(x) : `${sqliseString(x)}`}"`).join(', ')})`;
    }
    private async start() {
        await this.queryDatabase();
        await this.fillCache();

        return true;
    }
    private fillCache(): Promise<true> {
        return new Promise(async(resolve) => {
            const datas = await query<configs>(`SELECT * FROM configs`);
            this._cache.clear();

            for (const data of datas) {
                this._cache.set(data.guild_id, data);
            }
            resolve(true);
        })
    }
    private queryDatabase(): Promise<boolean> {
        return new Promise(async(resolve) => {
            await query(`CREATE TABLE IF NOT EXISTS configs ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, level_channel VARCHAR(255) NOT NULL DEFAULT '', level_msg VARCHAR(255) NOT NULL DEFAULT "Bien joué {user.mention} ! Tu passes niveau {user.level}", logs_channel VARCHAR(255) NOT NULL DEFAULT '', logs_enable TINYINT(1) NOT NULL DEFAULT '${boolDb(false)}' )`);
            resolve(true);
        })
    }
    public get cache() {
        return this._cache;
    }
}