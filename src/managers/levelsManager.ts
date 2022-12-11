import { Client, Collection } from "discord.js";
import { levels } from "../typings/database";
import query from "../utils/query";

export class LevelsManager {
    private client: Client;
    private cache: Collection<string, levels> = new Collection();

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    private async start() {
        await query(`CREATE TABLE IF NOT EXISTS levels ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, level INTEGER(255) NOT NULL DEFAULT '0', messages INTEGER(255) NOT NULL DEFAULT '0', required INTEGER(255) NOT NULL DEFAULT '255' )`);
        await this.fillCache();
        this.event();
    }

    private event() {
        this.client.on('messageCreate', (message) => {
            if (message.author.bot || message.webhookId || !message.guild || !this.client.modulesManager.enabled(message.guild.id, 'level')) return;
        })
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
            this.cache.clear();

            datas.forEach((d) => {
                this.cache.set(this.getCode(d), d);
            });

            resolve(true);
        })
    }
}