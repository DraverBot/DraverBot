import { Collection } from 'discord.js';
import { configKeys, configsData } from '../data/configData';
import { configs } from '../typings/database';
import query from '../utils/query';
import { boolDb, notNull, sqliseString } from '../utils/toolbox';
import { log4js } from 'amethystjs';

export class ConfigsManager {
    private _cache: Collection<string, configs> = new Collection();

    constructor() {
        this.start();
    }
    public getValue<T extends string | number | boolean | Buffer = string | number | boolean | Buffer>(
        guild_id: string,
        config: keyof configs
    ): T {
        if (!this._cache.has(guild_id)) return (config === 'guild_id' ? guild_id : configsData[config]?.default) as T;

        return this._cache.get(guild_id)[config] as T;
    }
    public async setValue<T extends keyof configKeys>(
        guild_id: string,
        config: T,
        value: configKeys[T]
    ): Promise<configs> {
        const exists = this._cache.has(guild_id);
        const data = this._cache.get(guild_id) ?? this.getDefaultValue(guild_id);
        data[config] = value as string;

        this._cache.set(data.guild_id, data);
        await query(this.buildQuery({ guild_id, value, key: config, exists }), this.isBlob(config) ? [value] : []);

        return data;
    }

    private isBlob(key: keyof configKeys) {
        const blobs = Object.keys(configsData).filter((x: keyof typeof configsData) => configsData[x].type === 'image');
        return blobs.includes(key);
    }
    private getDefaultValue(id: string): configs {
        const datas = {} as configs;
        Object.keys(configsData).forEach((key: keyof configKeys) => {
            datas[key as string] = configsData[key].default;
        });

        datas.guild_id = id;
        return datas;
    }
    private buildQuery({
        guild_id,
        value,
        key,
        exists
    }: {
        guild_id: string;
        value: Buffer | string | number | boolean;
        key: keyof configKeys;
        exists: boolean;
    }) {
        const transform = (x: Buffer | string | number | boolean) =>
            typeof x === 'boolean'
                ? `'${boolDb(x)}'`
                : typeof x === 'object'
                  ? `"${sqliseString((x as Buffer).toString())}"`
                  : `"${sqliseString(x as string)}"`;
        const datas = this._cache.get(guild_id);

        if (exists) {
            return `UPDATE configs SET ${key}=${
                this.isBlob(key) ? '?' : transform(value)
            } WHERE guild_id='${guild_id}'`;
        }

        const process = this.isBlob(key);
        let targetIndex: number;

        return `REPLACE INTO configs (${Object.keys(datas)
            .filter((x) => notNull(datas[x]))
            .map((x, i) => {
                if (x === key) targetIndex = i;
                return x;
            })
            .join(', ')}) VALUES (${Object.keys(datas)
            .map((x) => datas[x])
            .filter((x) => notNull(x))
            .map((x, i) => (process && i === targetIndex ? '?' : transform(x)))
            .join(', ')})`;
    }
    private async start() {
        await this.queryDatabase();
        await this.fillCache();

        return true;
    }
    private fillCache(): Promise<true> {
        return new Promise(async (resolve) => {
            const datas = await query<configs>(`SELECT * FROM configs`);
            this._cache.clear();

            const blobs = Object.keys(configsData).filter(
                (x: keyof typeof configsData) => configsData[x].type === 'image'
            );

            for (const data of datas) {
                const treats = {};
                blobs.forEach((x) => {
                    treats[x] = data[x];
                });

                this._cache.set(data.guild_id, {
                    ...data,
                    ...treats
                });
            }
            resolve(true);
        });
    }
    private buildColomn(key: keyof configKeys) {
        const data = configsData[key];

        if (data.type === 'channel' || data.type === 'role') return `${data.value} VARCHAR(255) NOT NULL DEFAULT ''`;
        if (data.type === 'boolean')
            return `${data.value} TINYINT(1) NOT NULL DEFAULT '${boolDb(data.default as boolean)}'`;
        if (data.type === 'number') return `${data.value} INTEGER(255) NOT NULL DEFAULT '${data.default}'`;
        if (data.type === 'image') return `${data.value} MEDIUMBLOB NOT NULL DEFAULT ''`;
        if (data.type === 'string')
            return `${data.value} VARCHAR(255) NOT NULL DEFAULT "${sqliseString(data.default as string)}"`;
    }
    private queryDatabase(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const tables = await query<{ Tables_in_draver: string }>(`SHOW TABLES`).catch(log4js.trace);

            if (tables && !tables.some((x) => x['Tables_in_draver'])) {
                await query(
                    `CREATE TABLE IF NOT EXISTS configs ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, ${Object.keys(
                        configsData
                    )
                        .map((key: keyof configKeys) => this.buildColomn(key))
                        .join(', ')} )`
                );
            } else {
                const description = await query<{
                    Field: string;
                    Type: string;
                    Null: string;
                    Key: string;
                    Default: string;
                    Extra: string;
                }>(`DESCRIBE configs`);
                const missing = Object.keys(configsData).filter((x) => !description.some((y) => y.Field === x));

                if (missing.length > 0) {
                    await query(
                        `ALTER TABLE configs ${missing.map((x) => `ADD ${this.buildColomn(x as keyof configKeys)}`).join(', ')}`
                    );
                }
            }
            resolve(true);
        });
    }
    public get cache() {
        return this._cache;
    }
}
