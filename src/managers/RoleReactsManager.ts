import { Client, Collection, Message, TextChannel, User } from 'discord.js';
import { RoleReact } from '../structures/RoleReact';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';
import { roleReactType, roleReacts } from '../typings/rolereact';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { removeKey, sqliseString } from '../utils/toolbox';
import GetEmojiStorage from '../process/GetEmojiStorage';

export class RolesReactManager {
    private client: Client;
    private _cache: Collection<number, RoleReact> = new Collection();

    constructor(client: Client) {
        this.client = client;

        this.init();
    }

    public get cache() {
        return this._cache;
    }
    public getList(serverId: string) {
        return this._cache.filter((x) => x.guild_id === serverId);
    }
    public exists(id: number) {
        return this._cache.has(id);
    }
    public delete(id: number) {
        if (!this.exists(id)) return false;
        this._cache.get(id).delete();
        this._cache.delete(id);

        return true;
    }
    public getPanel(id: number) {
        return this._cache.get(id);
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
        roles: { name: string; role_id: string; type: roleReactType; emoji: string }[];
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
            } ( guild_id, channel_id, message_id, ids, title, description, image) VALUES ( '${channel.guild.id}', '${
                channel.id
            }', '${message.id}', '${JSON.stringify(
                roles.map((x) => ({ emoji: GetEmojiStorage.process(x.emoji), ...removeKey(x, 'emoji') }))
            ).replace(/'/g, "\\'")}', "${sqliseString(title)}", "${sqliseString(description)}", '${image}' )`
        );

        const Roles = new RoleReact(this.client, {
            channel_id: channel.id,
            guild_id: channel.guild.id,
            message_id: message.id,
            id: res.insertId,
            image: image,
            title,
            description,
            ids: JSON.stringify(
                roles.map((x) => ({ emoji: GetEmojiStorage.process(x.emoji), ...removeKey(x, 'emoji') }))
            ).replace(/'/g, "\\'"),
            type: 'both',
            from_message: '0'
        });

        this._cache.set(res.insertId, Roles);
        return Roles;
    }
    public async fromMessage({
        message,
        roles,
        title,
        description
    }: {
        message: Message<true>;
        roles: { name: string; role_id: string; type: roleReactType; emoji: string }[];
        title: string;
        description: string;
    }) {
        const res = await query(
            `INSERT INTO ${
                DatabaseTables.RoleReacts
            } ( guild_id, channel_id, message_id, ids, title, description, from_message, image ) VALUES ('${
                message.guild.id
            }', '${message.channel.id}', '${message.id}', '${JSON.stringify(
                roles.map((x) => ({ emoji: GetEmojiStorage.process(x.emoji), ...removeKey(x, 'emoji') }))
            ).replace(/'/g, "\\'")}', "${sqliseString(title)}", "${sqliseString(description)}", '1', '')`
        );
        const Roles = new RoleReact(this.client, {
            channel_id: message.channel.id,
            guild_id: message.guild.id,
            message_id: message.id,
            id: res.insertId,
            image: '',
            title: '',
            description: '',
            type: 'both',
            from_message: '1',
            ids: JSON.stringify(
                roles.map((x) => ({ emoji: GetEmojiStorage.process(x.emoji), ...removeKey(x, 'emoji') }))
            ).replace(/'/g, "\\'")
        });

        this._cache.set(res.insertId, Roles);
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
            this._cache.set(x.id, new RoleReact(this.client, x));
        });
    }
    private async init() {
        await this.checkDb();
        this.fillCache();
    }
}
