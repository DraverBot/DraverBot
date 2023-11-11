import { Collection } from 'discord.js';
import { DatabaseTables, cooldowns } from '../typings/database';
import query from '../utils/query';
import { CooldownsInputOptions } from '../typings/managers';

export class CooldownsManager {
    private cache: Collection<string, cooldowns> = new Collection();

    constructor() {
        this.start();
    }

    public has(opts: CooldownsInputOptions) {
        return this.cache.has(this.getCode(opts));
    }

    public getCode({ guild_id, user_id, commandName }: CooldownsInputOptions) {
        return `${guild_id}.${user_id}:${commandName}`;
    }
    public getRemainingTime(opts: CooldownsInputOptions) {
        return this.cache.get(this.getCode(opts))?.endsAt - Date.now();
    }
    public set({ guild_id, user_id, cmd, time }: { guild_id: string; user_id: string; cmd: string; time: number }) {
        const code = this.getCode({ guild_id, user_id, commandName: cmd });
        this.cache.set(code, {
            guild_id,
            user_id,
            endsAt: Date.now() + time,
            commandName: cmd
        });

        query(
            `INSERT INTO ${
                DatabaseTables.Cooldowns
            } ( guild_id, user_id, commandName, endsAt ) VALUES ( "${guild_id}", "${user_id}", "${cmd}", "${
                Date.now() + time
            }" )`
        );

        setTimeout(() => {
            this.cache.delete(code);
            query(
                `DELETE FROM ${DatabaseTables.Cooldowns} WHERE guild_id='${guild_id}' AND user_id='${user_id}' AND commandName='${cmd}'`
            );
        }, time);
    }
    private async start() {
        await this.checkDb();
        this.fillCache();
    }
    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Cooldowns} ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, commandName VARCHAR(255) NOT NULL, endsAt BIGINT(255) NOT NULL )`
        );
        await query(`DELETE FROM ${DatabaseTables.Cooldowns} WHERE endsAt<="${Date.now()}"`);
        return true;
    }
    private async fillCache() {
        const cooldowns = await query<cooldowns>(`SELECT * FROM cooldowns`);
        this.cache.clear();

        for (const cd of cooldowns) {
            this.cache.set(this.getCode(cd), cd);
        }

        return true;
    }
}
