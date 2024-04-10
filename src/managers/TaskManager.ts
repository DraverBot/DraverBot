import { Client, Collection, Message, TextChannel, User } from 'discord.js';
import { Task } from '../structures/Task';
import query from '../utils/query';
import { DatabaseTables, tasks } from '../typings/database';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { sqliseString } from '../utils/toolbox';
import { langResolvable } from '../typings/core';

export class TaskManager {
    private _cache: Collection<number, Task> = new Collection();
    private client: Client;

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    public get cache() {
        return this._cache;
    }
    public exist(id: number) {
        return this._cache.has(id);
    }
    public assign({ userId, taskId }: { userId: string; taskId: number }) {
        if (!this.exist(taskId)) return 'unexisting';

        const task = this._cache.get(taskId);
        return task.assign(userId);
    }
    public unAssign({ userId, taskId }: { userId: string; taskId: number }) {
        if (!this.exist(taskId)) return 'unexisting';

        const task = this._cache.get(taskId);
        return task.removeAssignation(userId);
    }
    public close(taskId: number) {
        if (!this.exist(taskId)) return 'unexisting';

        return this._cache.get(taskId).close(true);
    }
    public done(taskId: number) {
        if (!this.exist(taskId)) return 'unexisting';

        return this._cache.get(taskId).done();
    }
    public getServer(guildId: string) {
        return this._cache.filter((x) => x.data.guild_id === guildId);
    }
    public getTask(taskId: number | string) {
        return this._cache.get(parseInt(taskId.toString()));
    }
    public async create({
        name,
        description,
        image,
        channel,
        by,
        time = 0,
        lang
    }: {
        name: string;
        description: string;
        image: string | null;
        channel: TextChannel;
        by: User;
        time?: number;
        lang: langResolvable
    }) {
        if (!channel.guild) return 'no guild found';
        const message = (await channel
            .send({
                embeds: [replies.wait(by, lang)]
            })
            .catch(log4js.trace)) as Message<true>;

        if (!message) return 'no message found';
        const insertion = await query(
            `INSERT INTO ${
                DatabaseTables.Tasks
            } ( guild_id, channel_id, message_id, description, name, image, assignees, deadline, opened_by, startedAt ) VALUES ( "${
                channel.guild.id
            }", '${channel.id}', '${message.id}', "${sqliseString(description)}", "${sqliseString(
                name
            )}", "${sqliseString(image)}", '[]', "${time == 0 ? 0 : message.createdAt.getTime() + time}", "${
                by.id
            }", "${message.createdAt.getTime()}" )`
        );

        if (!insertion) {
            message.edit({ embeds: [replies.internalError(by)] }).catch(log4js.trace);
            return 'insertion not found';
        }

        const task = new Task(this.client, {
            guild_id: channel.guild.id,
            channel_id: channel.id,
            message_id: message.id,
            id: insertion.insertId,
            deadline: time === 0 ? null : (message.createdAt.getTime() + time).toString(),
            state: 'pending',
            description,
            name,
            image: image ?? null,
            startedAt: message.createdAt.getTime().toString(),
            assignees: '[]',
            opened_by: by.id
        });

        this._cache.set(task.data.id, task);
        return task;
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Tasks} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, description VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, state VARCHAR(255) NOT NULL DEFAULT 'pending', image VARCHAR(255) NOT NULL DEFAULT '', assignees LONGTEXT, deadline VARCHAR(255) DEFAULT '0', opened_by VARCHAR(255) NOT NULL, startedAt VARCHAR(255) NOT NULL, id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT)`
        );

        return true;
    }
    private async fillCache() {
        const tasks = await query<tasks<true>>(`SELECT * FROM ${DatabaseTables.Tasks}`);

        if (!tasks) return log4js.trace('No response from database in tasks manager');
        for (const task of tasks) {
            this._cache.set(task.id, new Task(this.client, task));
        }
    }
    private async start() {
        await this.checkDb();
        this.fillCache();
    }
}
