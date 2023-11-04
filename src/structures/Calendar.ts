import { log4js } from 'amethystjs';
import {
    CalendarTables,
    calendarCache,
    calendarDatabase,
    calendarDay,
    calendarStorage,
    calendarUser,
    importReturn,
    openReturn
} from '../typings/christmas';
import query from '../utils/query';
import { Collection } from 'discord.js';
import { filterArray, notNull, sqliseString } from '../utils/toolbox';

class CalendarStats {
    private input: calendarUser;
    private datas: calendarCache;

    constructor(input: calendarUser, cache: calendarCache) {
        this.input = input;
        this.datas = cache;
    }

    public get cache() {
        return this.input;
    }
    public get id() {
        return this.input.id;
    }
    public get days() {
        return this.input.days;
    }

    public addDay(day: number) {
        if (!this.got(day)) this.input.days.push(day);
        this.sort();

        return this;
    }
    public toJSON() {
        return { ...this.input };
    }
    public got(day: number) {
        return this.input.days.some((x) => x === day);
    }
    public get stats() {
        return {
            total: this.datas.size,
            claimed: this.input.days.length,
            percent: (this.input.days.length * 100) / this.datas.size
        };
    }
    public get rewards() {
        return this.input.days.map((d) => [d, this.datas.get(d).reward]);
    }
    private sort() {
        this.input.days = [...this.input.days.sort((a, b) => a - b)];
    }
}
export class Calendar {
    private cache: calendarCache;
    private storage: calendarStorage;
    private bulking: boolean = false;
    private hasRow: boolean = false;

    constructor() {
        this.init();
    }

    public get today() {
        const day = new Date().getDate();
        return this.getDay(day);
    }

    public bulk() {
        this.bulking = !this.bulking;
        if (!this.bulking) this.update();
    }
    public addDay({ day, reward, force = false }: { day: number; reward: string; force?: boolean }) {
        if (this.hasDay(day) && force) {
            this.cache.set(day, { day, reward });

            this.update();
            return true;
        } else if (this.hasDay(day)) return false;

        this.cache.set(day, { day, reward });
        this.update();

        return true;
    }
    public removeDay(day: number) {
        const removed = this.cache.delete(day);
        if (removed) this.update();

        return removed;
    }
    public open(user: string): openReturn {
        const day = new Date().getDate();
        if (!this.hasDay(day)) return 'no day';

        const stats = this.getUser(user);
        if (stats.got(day)) return 'already claimed';

        stats.addDay(day);

        if (!this.hasUser(user)) this.storage.push(stats.toJSON());
        else this.storage = this.storage.map((x) => (x.id === user ? stats.toJSON() : x));

        this.update();
        return 'ok';
    }
    public getDay(day: number) {
        return this.cache.get(day);
    }
    public hasDay(day: number) {
        return this.cache.has(day);
    }
    public getUser(user: string): CalendarStats {
        const getter = () => {
            if (!this.hasUser(user)) return { id: user, days: [] };

            return this.storage.find((x) => x.id === user);
        };
        return new CalendarStats(getter(), this.cache);
    }
    public importFrom(json: calendarDay[]): importReturn {
        if (this.hasRow) return 'already defined';
        if (!Array.isArray(json)) return 'not array';
        json = json.filter((x) => notNull(x.day) && notNull(x.reward));
        if (json.length !== 24) return 'not 24';
        json = filterArray(json, 'day');
        if (json.length !== 24) return 'duplicate entries';

        this.cache = new Collection(json.map((x) => [x.day, { day: x.day, reward: x.reward }]));
        this.update();
        return 'ok';
    }

    private hasUser(user: string) {
        return this.storage.some((x) => x.id === user);
    }
    private async update() {
        if (this.bulking) return;

        const days = sqliseString(JSON.stringify(this.cache.toJSON()));
        const storage = sqliseString(JSON.stringify(this.storage));

        if (!this.hasRow) {
            const res = await query(
                `INSERT INTO ${CalendarTables.storage} ( days, storage ) VALUES ( "${days}", "${storage}" )`
            ).catch(log4js.trace);

            const ok = !!res && res?.affectedRows > 0;
            if (ok) this.hasRow = true;
            return ok;
        } else {
            const res = await query(`UPDATE ${CalendarTables.storage} SET days="${days}", storage="${storage}"`).catch(
                log4js.trace
            );

            return !!res && res.affectedRows > 0;
        }
    }
    private async checkDb() {
        await query(`CREATE TABLE IF NOT EXISTS ${CalendarTables.storage} ( days LONGTEXT, storage LONGTEXT )`);
        return true;
    }
    private async init() {
        await this.checkDb();
        const datas = await query<calendarDatabase<true>>(`SELECT * FROM ${CalendarTables.storage}`).catch(
            log4js.trace
        );
        if (!datas) return console.log(`No data for calendar`);

        if (!datas.length) {
            this.cache = new Collection();
            this.storage = [];
            return;
        }
        this.hasRow = true;
        this.cache = new Collection((JSON.parse(datas[0].days) as calendarDay[]).map((x) => [x.day, x]));
        this.storage = JSON.parse(datas[0].storage);
    }
}
