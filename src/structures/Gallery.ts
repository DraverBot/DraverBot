import { Collection } from 'discord.js';
import { ChristmasTables, galleryArt } from '../typings/christmas';
import query from '../utils/query';
import { random, sqliseString } from '../utils/toolbox';

export class Gallery {
    private cache: Collection<string, galleryArt>;

    constructor() {
        this.init();
    }

    public get random() {
        return this.cache.toJSON()[random({ max: this.cache.size })];
    }
    public add(art: galleryArt) {
        if (this.get(art.url)) return false;

        this.cache.set(art.url, art);
        query(
            `INSERT INTO ${ChristmasTables.gallery} ( url, user, when, name ) VALUES ("${art.url}", "${sqliseString(
                art.user
            )}", "${art.when}", "${sqliseString(art.name)}")`
        );
        return true;
    }
    public remove(url: string) {
        if (!this.get(url)) return false;

        this.cache.delete(url);
        query(`DELETE FROM ${ChristmasTables.gallery} WHERE url="${url}"`);

        return true;
    }
    public get(url: string) {
        return this.cache.get(url);
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${ChristmasTables.gallery} ( url VARCHAR(255) NOT NULL PRIMARY KEY, user VARCHAR(255), when VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL )`
        );
        return true;
    }
    private async fillCache() {
        const datas = await query<galleryArt<true>>(`SELECT * FROM ${ChristmasTables.gallery}`);
        if (!datas) return console.log('No data in gallery art');

        this.cache = new Collection(datas.map((x) => [x.url, { ...x, when: parseInt(x.when) }]));
    }
    private async init() {
        await this.checkDb();
        this.fillCache();
    }
}
