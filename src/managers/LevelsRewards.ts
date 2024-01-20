import { modulesManager, coinsManager, configsManager } from '../cache/managers';
import { BaseInteraction, Client, Guild, GuildMember } from 'discord.js';
import query from '../utils/query';
import { DatabaseTables, levelRewardType, levelRewards } from '../typings/database';
import { log4js } from 'amethystjs';
import { levelReward } from '../typings/managers';

type guildResolvable = Guild | BaseInteraction | GuildMember | string;
export class LevelsRewards {
    private client: Client;
    private cache: levelReward<levelRewardType>[] = [];

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    private getGuild(resolvable: guildResolvable) {
        return resolvable instanceof Guild
            ? resolvable.id
            : resolvable instanceof BaseInteraction || resolvable instanceof GuildMember
            ? resolvable.guild.id
            : resolvable;
    }
    public getRewards(guild: guildResolvable) {
        const id = this.getGuild(guild);
        return this.cache.filter((x) => x.guild_id === id);
    }
    public getReward(id: number) {
        return this.cache.find((x) => x.id === id);
    }
    public async addReward<T extends levelRewardType>({
        guild,
        type,
        value,
        level
    }: {
        guild: guildResolvable;
        type: T;
        value: T extends 'coins' ? number : string;
        level: number;
    }) {
        const id = this.getGuild(guild);

        const res = await query(
            `INSERT INTO ${DatabaseTables.LevelsRewards} ( guild_id, value, type, level ) VALUES ('${id}', '${value}', '${type}', '${level}')`
        ).catch(log4js.trace);
        if (!res) return 'not found';

        const data = {
            guild_id: id,
            value,
            type,
            level,
            id: res.insertId
        };
        this.cache.push(data);
        return data;
    }
    public removeReward(id: number) {
        query(`DELETE FROM ${DatabaseTables.LevelsRewards} WHERE id='${id}'`);
        this.cache = this.cache.filter((x) => x.id !== id);
    }
    private event() {
        this.client.on('levelUp', (member, levels) => {
            if (!configsManager.getValue(member.guild.id, 'level_rewards')) return;

            const rewards = this.getRewards(member);
            rewards
                .filter((x) => x.level === levels.level)
                .forEach((reward) => {
                    if (reward) {
                        if (reward.type === 'coins' && modulesManager.enabled(member.guild.id, 'economy')) {
                            coinsManager.addCoins({
                                coins: reward.value as number,
                                guild_id: member.guild.id,
                                user_id: member.id
                            });
                        } else {
                            member.roles.add(reward.value as string).catch(log4js.trace);
                        }
                    }
                });
        });
    }
    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.LevelsRewards} ( guild_id VARCHAR(255), level INTEGER(255), value VARCHAR(255), type VARCHAR(255), id INTEGER(255) PRIMARY KEY AUTO_INCREMENT )`
        );
        return true;
    }
    private async fillCache() {
        const res = await query<levelRewards>(`SELECT * FROM ${DatabaseTables.LevelsRewards}`);
        if (!res) return log4js.trace('No data in levels rewards table');

        res.forEach((x) => {
            this.cache.push({
                ...x,
                value: x.type === 'coins' ? parseInt(x.value) : x.value
            });
        });

        return true;
    }
    private async start() {
        await this.checkDb();
        await this.fillCache();
        this.event();
    }
}
