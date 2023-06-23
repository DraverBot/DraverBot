import { Client, Collection, Message, TextChannel, User } from 'discord.js';
import { Task } from '../structures/Task';
import query from '../utils/query';
import { DatabaseTables, tasks } from '../typings/database';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { sqliseString } from '../utils/toolbox';

export class TaskManager {
    private cache: Collection<number, Task> = new Collection();
    private client: Client;

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    public async create({
        name,
        description,
        image,
        channel,
        by,
        time = 0
    }: {
        name: string;
        description: string;
        image: string | null;
        channel: TextChannel;
        by: User;
        time?: number;
    }) {
        if (!channel.guild) return 'no guild found';
        const message = (await channel
            .send({
                embeds: [replies.wait(by)]
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
            )}", "${sqliseString(image)}", '[]', "${time}", "${by.id}", "${message.createdAt.getTime()}" )`
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
            deadline: time === 0 ? null : message.createdAt.getTime() + time,
            state: 'pending',
            description,
            name,
            image: image ?? null,
            started: message.createdAt.getTime(),
            assignees: '[]',
            opened_by: by.id
        });

        this.cache.set(task.data.id, task);
        return 'ok';
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Tasks} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, description VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, state VARCHAR(255) NOT NULL DEFAULT 'pending', image VARCHAR(255) NOT NULL DEFAULT '', assignees LONGTEXT, deadline INTEGER(255) DEFAULT '0', opened_by VARCHAR(255) NOT NULL, startedAt INTEGER(255) NOT NULL, id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT)`
        );

        return true;
    }
    private async fillCache() {
        const tasks = await query<tasks<true>>(`SELECT * FROM ${DatabaseTables.Tasks}`);

        if (!tasks) return log4js.trace('No response from database in tasks manager');
        for (const task of tasks) {
            this.cache.set(task.id, new Task(this.client, task));
        }
    }
    private async start() {
        await this.checkDb();
        this.fillCache();
    }
}
