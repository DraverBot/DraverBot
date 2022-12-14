import { Client, Collection, GuildMember, TextChannel } from "discord.js";
import { levels } from "../typings/managers";
import query from "../utils/query";

export class LevelsManager {
    private client: Client;
    private _cache: Collection<string, levels<number>> = new Collection();

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    private async start() {
        await query(`CREATE TABLE IF NOT EXISTS levels ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, level INTEGER(255) NOT NULL DEFAULT '0', messages INTEGER(255) NOT NULL DEFAULT '0', required INTEGER(255) NOT NULL DEFAULT '255' )`);
        await this.fillCache();
        this.event();
    }

    public leaderboard(guild_id?: string) {
        const datas = this._cache.filter(x => guild_id !== undefined && x.guild_id === guild_id);
        return datas.sort((a, b) => {
            if (a.level !== b.level) {
                return b.level - a.level
            } else {
                return b.messages - a.messages
            }
        })
    }

    public async reset(guild_id: string, user_id?: string) {
        if (user_id) {
            this.cache.delete(this.getCode({
                guild_id, user_id
            }));

            await query(`DELETE FROM levels WHERE guild_id='${guild_id}' AND user_id='${user_id}'`).catch(() => {});
        } else {
            this.cache.filter(x => x.guild_id === guild_id).forEach((value) => {
                this.cache.delete(this.getCode({
                    guild_id,
                    user_id: value.user_id
                }))
            })

            await query(`DELETE FROM levels WHERE guild_id='${guild_id}'`).catch(() => {});
        }
        return true;
    }
    private event() {
        this.client.on('messageCreate', (message) => {
            if (message.author.bot || message.webhookId || !message.guild || !this.client.modulesManager.enabled(message.guild.id, 'level')) return;

            const code = this.getCode({ guild_id: message.guild.id, user_id: message.author.id });
            const has = this._cache.has(code);

            const data = this._cache.get(code) ?? { messages: 0, level: 0, guild_id: message.guild.id, user_id: message.author.id, required: 255 };
            data.messages += 1;
        
            if (data.messages === data.required) {
                data.messages = 0;
                data.level += 1;

                data.required = data.required + Math.floor(data.required * (1/3));

                this.client.emit('levelUp', message.member as GuildMember, data, message.channel as TextChannel);
            }

            this._cache.set(code, data);
            query(this.buildSQL(code, has));
        })
    }
    private buildSQL(code: string, has: boolean) {
        const data = this._cache.get(code);

        if (has) return `UPDATE levels SET messages='${data.messages}', level='${data.level}', required='${data.required}' WHERE user_id='${data.user_id}' AND guild_id='${data.guild_id}'`
        return `INSERT INTO levels (guild_id, user_id, required, messages, level) VALUES ('${data.guild_id}', '${data.user_id}', '${data.required}', '${data.messages}', '${data.level}')`;
    }
    private getCode({ guild_id, user_id }: { guild_id: string; user_id: string; }): string {
        return `${guild_id}.${user_id}`;
    }
    private getIds(code: string): { guild_id: string; user_id: string; } {
        const parts = code.split('.');

        if (parts.length === 0) return undefined;
        return {
            guild_id: parts[0],
            user_id: parts[1]
        }
    }

    private fillCache(): Promise<boolean> {
        return new Promise(async(resolve) => {
            const datas = await query<levels>(`SELECT * FROM levels`);
            this._cache.clear();

            datas.forEach((d) => {
                this._cache.set(this.getCode(d), {
                    ...d,
                    messages: parseInt(d.messages),
                    level: parseInt(d.level),
                    required: parseInt(d.required)
                });
            });

            resolve(true);
        })
    }

    public get cache() {
        return this._cache;
    }
}

declare module 'discord.js' {
    interface ClientEvents {
        levelUp: [ member: GuildMember, level: levels<number>, channel: TextChannel ]
    }
}