import { Client, Collection, Guild, TextChannel, Webhook, WebhookClient } from 'discord.js';
import { Anonymous as AnonymousDataType, DatabaseTables } from '../typings/database';
import { basicEmbed, evokerColor, hint, notNull, pingChan, sendError, sendLog, sqliseString } from '../utils/toolbox';
import query from '../utils/query';

export class AnonymousValue {
    private _data: AnonymousDataType;
    public channel: TextChannel;
    public readonly client: Client;
    public webhook: WebhookClient;
    public bannedRoles: string[];
    public bannedUsers: string[];
    public guild: Guild;
    public valid = true;

    constructor(client: Client, data: AnonymousDataType) {
        this.client = client;
        this._data = data;

        this.build();
    }

    private async build() {
        this.guild = this.client.guilds.cache.get(this._data.guild_id);

        this.channel = this.guild.channels.cache.get(this._data.channel_id) as TextChannel;
        this.webhook = new WebhookClient({ url: this._data.webhook_url });

        this.bannedRoles = JSON.parse(this._data.banned_roles ?? '[]');
        this.bannedUsers = JSON.parse(this._data.banned_users ?? '[]');
        if (
            !this.webhook ||
            this.data.webhook_url ===
                'https://discord.com/api/webhooks/1071478746462306416/invalid-webhook-authentication-completly-impossible-with-this-absurdly-long-message'
        ) {
            const web = (await this.channel
                .createWebhook({
                    name: this._data.name,
                    avatar: 'https://media.discordapp.net/attachments/1012743337754771486/1071455317554122793/anBn.png?width=616&height=671',
                    reason: "Besoin d'un webhook anonyme"
                })
                .catch(sendError)) as Webhook;

            if (!web) {
                sendLog({
                    guild: this.guild,
                    action: 'WebhookCreationFailed',
                    member_id: '',
                    mod_id: this.client.user.id,
                    reason: `La création d'un webhook dans ${pingChan(
                        this.channel
                    )} pour le système d'anonymat a échoué`
                }).catch(() => {});
                this.valid = false;
            }

            query(`UPDATE ${DatabaseTables.Anonymous} SET webhook_url='${web.url}' WHERE id='${this._data.id}'`);
            this.webhook = new WebhookClient({
                url: web.url
            });
        }
    }
    public get data() {
        return this._data;
    }
    private saveUsers() {
        this._data.banned_users = JSON.stringify(this.bannedUsers);
    }
    private saveRoles() {
        this._data.banned_roles = JSON.stringify(this.bannedRoles);
    }
    public addBannedUser(id: string) {
        if (!this.bannedUsers.includes(id)) this.bannedUsers.push(id);

        this.saveUsers();
    }
    public addBannedRole(id: string) {
        if (!this.bannedRoles.includes(id)) this.bannedRoles.push(id);

        this.saveRoles();
    }
    public removeBannedUser(id: string) {
        if (this.bannedUsers.includes(id)) this.bannedUsers.splice(this.bannedUsers.indexOf(id), 1);

        this.saveUsers();
    }
    public removeBannedRole(id: string) {
        if (this.bannedRoles.includes(id)) this.bannedRoles.splice(this.bannedRoles.indexOf(id), 1);

        this.saveRoles();
    }
}

export class AnonymousManager {
    private client: Client;
    private _values: Collection<string, AnonymousValue> = new Collection();
    private _cache: Collection<number, AnonymousDataType> = new Collection();
    private failsCounter: Record<string, number> = {};

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    private event() {
        this.client.on('messageCreate', (message) => {
            if (message.author.bot || !message.guild || message.webhookId) return;

            const data = this._cache.find(
                (x) => x.guild_id === message.guild.id && x.channel_id === message.channel.id
            );
            if (!data) return;

            const value = this._values.get(data.id.toString());
            if (
                value.bannedRoles.some((x) => message.member.roles.cache.has(x)) ||
                value.bannedUsers.includes(message.author.id)
            )
                return;

            message.delete().catch(() => {});
            if (!value.valid) {
                const count = this.failCounter(message.guild.id);

                if (count % 6 === 0) {
                    message.channel
                        .send({
                            embeds: [
                                basicEmbed(message.client.user)
                                    .setTitle('Erreur de webhook')
                                    .setDescription(
                                        `Le système d'anonymat sur ce salon est mal définit : le webhook servant à l'anonymisation des messages n'existe pas.\n${hint(
                                            `Utilisez la commande de configuration du système d'anonymat pour le configurer`
                                        )}`
                                    )
                                    .setColor(evokerColor(message.guild))
                            ]
                        })
                        .catch(() => {});
                }

                return;
            }
            value.webhook
                .send({
                    content: message.content
                        .replace(/\@everyone/g, '@ everyone')
                        .replace(/\@here/g, '@ here')
                        .replace(/<@&\!?\d+>/, '@role')
                        .replace(/<@\!?\d+>/, '@utilisateur')
                })
                .catch((error) => {
                    sendError(error);
                    this.values.set(
                        value.data.id.toString(),
                        new AnonymousValue(this.client, {
                            ...value.data,
                            webhook_url:
                                'https://discord.com/api/webhooks/1071478746462306416/invalid-webhook-authentication-completly-impossible-with-this-absurdly-long-message-5691-1139A-0761732670'
                        })
                    );
                });
        });
    }

    private failCounter(id: string) {
        const value = this.failsCounter[id] ?? 0;
        this.failsCounter[id] = value + 1;

        return value;
    }
    private async start() {
        await this.fillCache();
        this.event();
    }
    private async fillCache() {
        const datas = await query<AnonymousDataType>(`SELECT * FROM ${DatabaseTables.Anonymous}`);

        this._values.clear();
        datas.forEach((data) => {
            const value = new AnonymousValue(this.client, data);
            this._values.set(value.data.id.toString(), value);
            this._cache.set(data.id, data);
        });
    }

    public isConfigured(channel: TextChannel) {
        return notNull(
            this._values.find(
                (x) => x.data.channel_id === channel.id && x.data.guild_id === channel.guild.id && x.valid
            )
        );
    }

    public async create({
        guild,
        channel,
        name = 'Anonyme',
        bannedRoles = [],
        bannedUsers = []
    }: {
        name?: string;
        guild: Guild;
        channel: TextChannel;
        bannedUsers?: string[];
        bannedRoles?: string[];
    }) {
        const test = this._values.find((x) => x.guild.id === guild.id && x.channel.id === channel.id && x.valid);
        if (test) return test;

        const webhook = await channel
            .createWebhook({
                name,
                reason: `Création d'un webhook pour un système d'anonymat`,
                avatar: 'https://media.discordapp.net/attachments/1012743337754771486/1071455317554122793/anBn.png?width=616&height=671'
            })
            .catch(() => {});

        if (!webhook) return 'webhook creation failed';
        await query(
            `INSERT INTO ${
                DatabaseTables.Anonymous
            } ( guild_id, channel_id, webhook_url, name, banned_roles, banned_users ) VALUES ('${guild.id}', '${
                channel.id
            }', '${webhook.url}', "${sqliseString(name)}", '${sqliseString(
                JSON.stringify(bannedRoles)
            )}', '${sqliseString(JSON.stringify(bannedUsers))}')`
        );
        const results = await query<AnonymousDataType>(
            `SELECT * FROM ${DatabaseTables.Anonymous} WHERE name="${sqliseString(name)}" AND guild_id='${
                guild.id
            }' AND channel_id='${channel.id}' ORDER BY id DESC`
        );
        const data = results[0];
        const value = new AnonymousValue(this.client, data);

        this._cache.set(data.id, data);
        this._values.set(data.id.toString(), value);
    }
    public async delete(dataId: string) {
        if (this._cache.has(parseInt(dataId))) {
            this._cache.delete(parseInt(dataId));

            const value = this._values.get(dataId);
            value.webhook.delete().catch(() => {});

            this._values.delete(dataId);

            await query(`DELETE FROM ${DatabaseTables.Anonymous} WHERE id='${dataId}'`);
        }
        return true;
    }

    public async addBannedUser(dataId: string, userId: string) {
        const value = this._values.get(dataId);

        value.addBannedUser(userId);
        this._cache.set(value.data.id, value.data);

        await query(`UPDATE ${DatabaseTables.Anonymous} SET banned_users='${value.data.banned_users}'`);
        return value.data;
    }
    public async addBannedRole(dataId: string, roleId: string) {
        const value = this._values.get(dataId);

        value.addBannedRole(roleId);
        this._cache.set(value.data.id, value.data);

        await query(`UPDATE ${DatabaseTables.Anonymous} SET banned_roles='${value.data.banned_roles}'`);
        return value.data;
    }
    public async removeBannedUser(dataId: string, userId: string) {
        const value = this._values.get(dataId);

        value.removeBannedUser(userId);
        this._cache.set(value.data.id, value.data);

        await query(`UPDATE ${DatabaseTables.Anonymous} SET banned_users='${value.data.banned_users}'`);
        return value.data;
    }
    public async removeBannedRole(dataId: string, roleId: string) {
        const value = this._values.get(dataId);

        value.removeBannedRole(roleId);
        this._cache.set(value.data.id, value.data);

        await query(`UPDATE ${DatabaseTables.Anonymous} SET banned_roles='${value.data.banned_roles}'`);
        return value.data;
    }

    public get values() {
        return this._values;
    }
    public get cache() {
        return this._cache;
    }
}
