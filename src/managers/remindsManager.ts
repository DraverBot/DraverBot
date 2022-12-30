import { Client, Collection, TextChannel } from 'discord.js';
import { RemindsPlaceType, reminds } from '../typings/managers';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';
import { pingUser, sqliseString } from '../utils/toolbox';

export class RemindsManager {
    private _cache: Collection<number, reminds> = new Collection();
    public readonly client: Client;

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    public setRemind({
        user_id,
        reason,
        time,
        place = 'mp',
        channel
    }: {
        user_id: string;
        place?: RemindsPlaceType;
        reason: string;
        time: number;
        channel?: TextChannel;
    }): Promise<reminds> {
        return new Promise(async (resolve) => {
            const insertDate = Date.now();
            await query(
                `INSERT INTO ${
                    DatabaseTables.Reminds
                } ( user_id, reason, at, place, channel_id, setDate ) VALUES ( "${user_id}", "${sqliseString(
                    reason
                )}", "${insertDate + time}", "${place}", "${
                    place === 'achannel' ? channel?.id ?? '' : ''
                }", "${Date.now()}" )`
            );
            const result = await query<reminds>(
                `SELECT * FROM ${DatabaseTables.Reminds} WHERE user_id='${user_id}' AND place='${place}' AND at="${
                    insertDate + time
                }"`
            );
            const rmd = result[0];
            this._cache.set(rmd.id, rmd);

            setTimeout(() => {
                this.sendRmd(rmd.id);
            }, time);

            return resolve(rmd);
        });
    }
    public deleteRemind(id: number) {
        return new Promise(async (resolve) => {
            const rmd = this._cache.get(id);

            this._cache.delete(id);
            await query(`DELETE FROM ${DatabaseTables.Reminds} WHERE id='${id}'`);

            return resolve(rmd);
        });
    }
    public getUserReminds(user_id: string) {
        return this._cache.filter((x) => x.user_id === user_id);
    }
    private async start() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Reminds} ( user_id VARCHAR(255) NOT NULL, reason VARCHAR(255) NOT NULL, at BIGINT(255), place VARCHAR(255) NOT NULL DEFAULT 'mp', channel_id VARCHAR(255) DEFAULT NULL, id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT, setDate VARCHAR(255) NOT NULL )`
        );
        await this.fillCache();
        this._cache.forEach((rmd) => {
            setTimeout(() => {
                this.sendRmd(rmd.id);
            }, rmd.at - Date.now());
        });
    }
    private sendRmd(id: number) {
        const rmd = this._cache.get(id);
        if (!rmd) return;

        if (rmd.place === 'mp') {
            const user = this.client.users.cache.get(rmd.user_id);

            user.send({
                content: `🔔 Rappel : ${rmd.reason} ( <t:${Math.floor(parseInt(rmd.setDate) / 1000)}:R> )`
            }).catch(() => {});
            this._cache.delete(id);
            query(`DELETE FROM ${DatabaseTables.Reminds} WHERE id='${id}'`);
        } else {
            const channel = this.client.channels.cache.get(rmd.channel_id);

            if (!channel) {
                const user = this.client.users.cache.get(rmd.user_id);

                user.send({
                    content: `🔔 Rappel : ${rmd.reason} ( <t:${Math.floor(parseInt(rmd.setDate) / 1000)}:R> )`
                }).catch(() => {});
            } else {
                (channel as TextChannel)
                    .send({
                        content: `🔔 ${pingUser(rmd.user_id)} : ${rmd.reason} ( <t:${Math.floor(
                            parseInt(rmd.setDate) / 1000
                        )}:R> )`
                    })
                    .catch(() => {});
            }
            this._cache.delete(id);
            query(`DELETE FROM ${DatabaseTables.Reminds} WHERE id='${id}'`);
        }
    }
    private async fillCache() {
        const datas = await query<reminds>(`SELECT * FROM ${DatabaseTables.Reminds}`);
        this._cache.clear();

        for (const data of datas) {
            this._cache.set(data.id, data);
        }

        return true;
    }
    public get cache() {
        return this._cache;
    }
}
