import { Client, Collection, TextChannel } from 'discord.js';
import query from '../utils/query';
import { DatabaseTables, lotos } from '../typings/database';
import { lotoCollection, lotoCollectionParticipants } from '../typings/managers';
import { log4js } from 'amethystjs';
import { boolDb, dbBool, random } from '../utils/toolbox';

class Loto {
    private _id: string;
    private _participants: lotoCollectionParticipants;
    private _startedAt: string;
    private _endsAt: string;
    private _coins: number;
    private _guildId: string;
    private client: Client;
    private _winners: string[] = [];
    private _ended = false;
    private _numbers: number;
    private _complementaries: number;
    private _channelId: string;
    private channel: TextChannel;
    private timeout: NodeJS.Timeout;

    constructor(data: lotoCollection, client: Client) {
        this._id = data.id;
        this._participants = data.participants;
        this._coins = data.coins;
        this._startedAt = data.startedAt;
        this._guildId = data.guildId;
        this._endsAt = data.endsAt;
        this._ended = data.ended;
        this._numbers = data.numbers;
        this._complementaries = data.complementaries;
        this._channelId = data.channelId;

        this.client = client;
        this.start();
    }

    public get ended() {
        return this._ended;
    }
    public get channelId() {
        return this._channelId;
    }
    public get complementaries() {
        return this._complementaries;
    }
    public get numbers() {
        return this._numbers;
    }
    public get winners() {
        return this._winners;
    }
    public get guildId() {
        return this._guildId;
    }
    public get coins() {
        return this._coins;
    }
    public get endsAt() {
        return this._endsAt;
    }
    public get startedAt() {
        return this._startedAt;
    }
    public get participants() {
        return this._participants;
    }
    public get id() {
        return this._id;
    }

    private roll() {
        const numbers: number[] = [];
        const complementaries: number[] = [];

        const available: number[] = [];
        for (let i = 1; i < 100; i++) {
            available.push(i);
        }

        for (let i = 0; i < this._numbers; i++) {
            const int = available[random({ max: available.length })];
            numbers.push(int);

            available.splice(available.indexOf(int), 1);
        }
        for (let i = 0; i < this._complementaries; i++) {
            const int = available[random({ max: available.length })];
            complementaries.push(int);

            available.splice(available.indexOf(int, 1));
        }

        return { numbers, complementaries };
    }
    private findWinners(rolls: { numbers: number[]; complementaries: number[] }) {
        const winners = this._participants.filter(
            (p) => p.numbers.filter((x) => rolls.numbers.includes(x)).length == p.numbers.length
        );

        this._winners = winners.map((x) => x.userId);
        return winners;
    }
    private sqlliseParticipants() {
        return JSON.stringify(this._participants.map((p) => [p.userId, p.numbers, p.complementaries]));
    }
    public participate(userId: string) {
        return !!this._participants.find((x) => x.userId === userId);
    }
    public registerParticipation({
        userId,
        numbers,
        complementaries
    }: {
        userId: string;
        numbers: number[];
        complementaries: number[];
    }) {
        if (this.participate(userId)) return true;

        if (numbers.length != this._numbers || complementaries.length != this._complementaries)
            return 'invalid numbers array';
        if (new Set(numbers.concat(complementaries)).size != numbers.length + complementaries.length)
            return 'one of arrays has duplicates';

        this._participants.push({
            userId: userId,
            numbers,
            complementaries
        });
        query(`UPDATE ${DatabaseTables.Loto} SET participants='${this.sqlliseParticipants()}' WHERE id="${this._id}"`);
        return true;
    }
    public unregisterParticipation(userId: string) {
        if (!this.participate(userId)) return false;

        this._participants = this._participants.filter((x) => x.userId != userId);
        query(`UPDATE ${DatabaseTables.Loto} SET participants='${this.sqlliseParticipants()}' WHERE id='${this._id}'`);
        return true;
    }
    public userEnds() {
        const rolling = this.roll();
        const splitedPrice = this._coins / this._winners.length;

        const winners = this.findWinners(rolling).map((winner) => {
            const corrects = winner.numbers.concat(winner.complementaries).filter((int) => {
                rolling.complementaries.concat(rolling.numbers).includes(int);
            });

            const accuracy = corrects.length / (this._complementaries + this._numbers);
            const award = Math.floor(this._winners.length == 0 ? 0 : (splitedPrice * (accuracy * 100)) / 100);

            return {
                ...winner,
                accuracy,
                reward: award
            };
        });

        winners.forEach((winner) => {
            this.client.coinsManager.addCoins({
                coins: winner.reward,
                guild_id: this._guildId,
                user_id: winner.userId
            });
        });

        query(`UPDATE ${DatabaseTables.Loto} SET ended='${boolDb(true)}' WHERE id='${this._id}'`);
        return {
            winners,
            rolled: rolling
        };
    }
    public delete() {
        clearTimeout(this.timeout);
        query(`DELETE FROM ${DatabaseTables.Loto} WHERE id='${this.id}'`);
    }
    private ends() {
        if (this.timeout) clearTimeout(this.timeout);
        if (!this.channel) console.log('No channel');
        if (this.channel)
            this.channel
                .send({
                    content: `Le loto est terminé !\nUtilisez \`loto tirage\` pour faire le tirage`
                })
                .catch(log4js.trace);
    }
    private async start() {
        if (this._ended) return;

        const channel = await this.client.channels.fetch(this._channelId);
        if (!channel) log4js.trace('No channel found for a loto');

        this.channel = channel as TextChannel;

        const timediff = parseInt(this._endsAt) - Date.now();
        if (timediff <= 0) {
            this.ends();
        } else {
            this.timeout = setTimeout(() => {
                this.ends();
            }, timediff);
        }
    }
}
export class LotoManager {
    private client: Client;
    private _cache: Collection<string, Loto> = new Collection();

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    public get cache() {
        return this._cache;
    }
    public lotoExists(id: string) {
        return this._cache.has(id);
    }
    public getLoto(id: string) {
        return this._cache.get(id);
    }
    public registerParticipation(
        id: string,
        participation: { userId: string; numbers: number[]; complementaries: number[] }
    ) {
        if (!this.lotoExists(id)) return 'unexisting loto';
        return this.getLoto(id).registerParticipation(participation);
    }
    public unregisterParticipation(id: string, userId: string) {
        if (!this.lotoExists(id)) return 'unexisting loto';
        return this.getLoto(id).unregisterParticipation(userId);
    }
    public end(id: string) {
        if (!this.lotoExists(id)) return 'unexisting loto';
        return this.getLoto(id).userEnds();
    }
    public cancelLoto(id: string) {
        if (!this.lotoExists(id)) return 'unexisting loto';
        this.getLoto(id).delete();

        return true;
    }
    public getGuildLoto(guildId: string) {
        return this._cache.find((x) => x.guildId == guildId);
    }
    public async create({
        time,
        guild_id,
        numbers,
        complementaries,
        channel_id,
        coins = 0
    }: {
        time: number;
        guild_id: string;
        numbers: number;
        complementaries: number;
        channel_id: string;
        coins?: number;
    }) {
        if (this._cache.find((x) => x.guildId == guild_id) && !this._cache.find((x) => x.guildId == guild_id).ended)
            return 'loto already started';
        const startedAt = Date.now();
        const endsAt = startedAt + time;

        const result = await query(
            `INSERT INTO ${
                DatabaseTables.Loto
            } ( guild_id, startedAt, endsAt, participants, numbers, complementaries, coins, ended, channel_id ) VALUES ( "${guild_id}", "${startedAt}", "${endsAt}", "[]", "${numbers}", "${complementaries}", "${coins}", "${boolDb(
                false
            )}", "${channel_id}" )`
        );

        if (!result) return 'unable to database the loto';
        const id = result.insertId;

        const loto = new Loto(
            {
                channelId: channel_id,
                coins,
                numbers,
                complementaries,
                guildId: guild_id,
                id: id.toString(),
                participants: [],
                startedAt: startedAt.toString(),
                endsAt: endsAt.toString(),
                ended: false
            },
            this.client
        );

        this._cache.set(id.toString(), loto);
        return loto;
    }

    private async fill() {
        const datas = await query<lotos<true>>(`SELECT * FROM ${DatabaseTables.Loto}`);
        if (!datas) return log4js.trace(`No returns from loto database fetch`);

        datas.forEach((data) => {
            const info: lotoCollection = {
                id: data.id.toString(),
                participants: (JSON.parse(data.participants) as [string, number[], number[]][]).map((x) => ({
                    userId: x[0],
                    numbers: x[1],
                    complementaries: x[2]
                })),
                guildId: data.guild_id,
                coins: data.coins,
                startedAt: data.startedAt,
                endsAt: data.endsAt,
                ended: dbBool(data.ended),
                channelId: data.channel_id,
                numbers: data.numbers,
                complementaries: data.complementaries
            };

            this._cache.set(info.id, new Loto(info, this.client));
        });
    }
    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${
                DatabaseTables.Loto
            } ( id INTEGER NOT NULL PRIMARY KEY, startedAt VARCHAR(255) NOT NULL, endsAt VARCHAR(255) NOT NULL, participants LONGTEXT, numbers INTEGER(255) NOT NULL DEFAULT "5", complementaries INTEGER NOT NULL DEFAULT "2", coins INTEGER(255) NOT NULL DEFAULT "0", guild_id VARCHAR(255) NOT NULL, ended TINYINT(1) NOT NULL DEFAULT "${boolDb(
                false
            )}", channel_id VARCHAR(255) NOT NULL )`
        );
        return true;
    }
    private async start() {
        await this.checkDb();
        this.fill();
    }
}
