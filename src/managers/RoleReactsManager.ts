import { Client, Collection, Message, TextChannel, User } from 'discord.js';
import { RoleReact } from '../structures/RoleReact';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';
import { roleReactType, roleReacts } from '../typings/rolereact';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { sqliseString } from '../utils/toolbox';

export class RolesReactManager {
    private client: Client;
    private cache: Collection<number, RoleReact> = new Collection();

    constructor(client: Client) {
        this.client = client;

        this.init();
    }

    public async create({
        title,
        description,
        image = '',
        roles,
        channel,
        user
    }: {
        title: string;
        description: string;
        image?: string | '';
        roles: { name: string; role_id: string; type: roleReactType }[];
        channel: TextChannel;
        user: User;
    }) {
        const message = (await channel
            .send({
                embeds: [replies.wait(user)]
            })
            .catch(log4js.trace)) as Message<true>;
        if (!message) return 'message not found';

        const res = await query(
            `INSERT INTO ${
                DatabaseTables.RoleReacts
            } ( guild_id, channel_id, message_id, ids, title, description) VALUES ( '${channel.guild.id}', '${
                channel.id
            }', '${message.id}', '${JSON.stringify(roles).replace(/'/g, "\\'")}', "${sqliseString(
                title
            )}", "${sqliseString(description)}" )`
        );

        const Roles = new RoleReact(this.client, {
            channel_id: channel.id,
            guild_id: channel.guild.id,
            message_id: message.id,
            id: res.insertId,
            image: image,
            title,
            description,
            ids: JSON.stringify(roles).replace(/'/g, "\\'"),
            type: 'both'
        });

        this.cache.set(res.insertId, Roles);
        return Roles;
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.RoleReacts} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, ids LONGTEXT,  type VARCHAR(255) NOT NULL DEFAULT 'both', id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT, title VARCHAR(256) NOT NULL, description VARCHAR(4096) NOT NULL, image VARCHAR(255) NOT NULL DEFAULT '' )`
        );
        return true;
    }
    private async fillCache() {
        const datas = await query<roleReacts<true>>(`SELECT * FROM ${DatabaseTables.RoleReacts}`);
        if (!datas) return log4js.trace('No data in database for Roles React manager');

        datas.forEach((x) => {
            this.cache.set(x.id, new RoleReact(this.client, x));
        });
    }
    private async init() {
        await this.checkDb();
        this.fillCache();
    }
}
