import { Client, Collection, TextChannel, WebhookClient } from 'discord.js';
import { replyKey } from '../data/replies';
import { interserver } from "../typings/managers";
import query from '../utils/query';
import { WordGenerator } from './Generator';

export class InterserverManager {
    private _cache: Collection<string, interserver> = new Collection();
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    public createInterserver({
        guild_id,
        channel,
        frequence
    }: {
        guild_id: string;
        channel: TextChannel;
        frequence?: string;
    }): Promise<replyKey | interserver> {
        return new Promise(async (resolve) => {
            if (this._cache.has(channel.id)) return resolve('interserverAlreadySet');

            const webhook = await channel
                .createWebhook({
                    name: 'Draver',
                    avatar: channel.client.user.displayAvatarURL({ forceStatic: true }),
                    reason: "Webhook pour le système d'interchat de Draver"
                })
                .catch(() => {});
            if (!webhook) return resolve('interserverWebhookFailed');

            const generated = frequence ?? (await this.generateUniqueFrequence().catch(() => {}));
            if (!generated) return resolve('interserverNoFrequence');

            if (this._cache.find((x) => x.guild_id === guild_id && x.frequence === generated))
                return resolve('interserverFrequenceAssigned');
            if (!this._cache.find((x) => x.frequence === frequence) && ![undefined, null].includes(frequence))
                return resolve('interserverUnexistingFrequence');

            const data: interserver = {
                guild_id,
                channel_id: channel.id,
                frequence: generated,
                webhook: webhook.url
            };

            await query(
                `INSERT INTO interserver (guild_id, channel_id, webhook, frequence) VALUES ('${guild_id}', '${channel.id}', '${webhook.url}', '${generated}')`
            ).catch(() => {});
            this._cache.set(channel.id, data);

            return resolve(data);
        });
    }

    public removeInterserver({
        guild_id,
        channel
    }: {
        guild_id: string;
        channel: TextChannel;
    }): Promise<interserver | replyKey> {
        return new Promise(async (resolve) => {
            const data = this._cache.get(channel.id);
            if (!data) return resolve('interserverNotChannel');

            await query(`DELETE FROM interserver WHERE channel_id='${channel.id}' AND guild_id='${guild_id}'`);
            this._cache.delete(channel.id);

            const web = new WebhookClient({ url: data.webhook });
            if (web) web.delete("Salon d'interchat supprimé");

            return resolve(data);
        });
    }

    public editFrequence({
        guild_id,
        channel_id,
        frequence
    }: {
        guild_id: string;
        channel_id: string;
        frequence: string;
    }): Promise<replyKey | interserver> {
        return new Promise(async (resolve) => {
            const data = this._cache.get(channel_id);
            if (!data) return resolve('interserverNotChannel');

            if (this._cache.find((x) => x.guild_id === guild_id && x.frequence === frequence))
                return resolve('interserverFrequenceAssigned');

            this._cache.set(data.channel_id, {
                ...data,
                frequence
            });
            await query(
                `UPDATE interserver SET frequence='${frequence}' WHERE guild_id='${guild_id}' AND channel_id='${channel_id}'`
            ).catch(() => {});
            return resolve(this._cache.get(channel_id));
        });
    }

    public get cache() {
        return this._cache;
    }

    private async start() {
        await query(
            `CREATE TABLE IF NOT EXISTS interserver ( channel_id VARCHAR(255) NOT NULL, frequence VARCHAR(255) NOT NULL, webhook VARCHAR(255) NOT NULL, guild_id VARCHAR(255) NOT NULL )`
        );
        await this.fillCache();
        this.event();
    }
    private event() {
        this.client.on('messageCreate', (message) => {
            const data = this._cache.get(message.channel.id);
            if (
                !data ||
                !message.client.modulesManager.enabled(message.guild.id, 'interchat') ||
                message.author.bot ||
                message.webhookId ||
                message.system ||
                message.mentions.everyone ||
                /<@((\!){0,1})\d+>/.test(message.content)
            )
                return;

            const sendTo = this._cache.filter(
                (x) =>
                    x.frequence === data.frequence &&
                    message.client.modulesManager.enabled(x.guild_id, 'interchat') &&
                    x.guild_id !== message.guild.id
            );

            if (sendTo.size === 0) return;
            sendTo.forEach(async (v) => {
                let webhook = new WebhookClient({ url: v.webhook });
                if (!webhook) {
                    const channel = (await this.client.channels.fetch(v.channel_id)) as TextChannel;
                    if (!channel) return;

                    const web = await channel
                        .createWebhook({
                            name: 'Interchat',
                            reason: "Pour l'interchat de Draver",
                            avatar: message.client.user.displayAvatarURL({ forceStatic: true })
                        })
                        .catch(() => {});
                    if (!web) return;

                    webhook = new WebhookClient({ url: web.url });
                    this._cache.set(v.channel_id, {
                        ...v,
                        webhook: web.url
                    });

                    query(`UPDATE interserver SET webhook='${web.url}' WHERE channel_id='${v.channel_id}'`).catch(
                        () => {}
                    );
                }

                webhook
                    .send({
                        username: message.author.username,
                        avatarURL: message.author.avatarURL({ forceStatic: false }),
                        content: message.content
                    })
                    .catch(() => {});
            });
        });
    }
    private async fillCache() {
        const datas = await query<interserver>(`SELECT * FROM interserver`);
        this._cache.clear();

        datas.forEach((v) => {
            this._cache.set(v.channel_id, v);
        });
    }
    private generateUniqueFrequence() {
        return new Promise<string>((resolve, reject) => {
            let collisions = 0;
            const forbidden = this._cache.map((x) => x.frequence);

            const generator = new WordGenerator({ length: 16, special: true, letters: true });

            const tryFrequenceGeneration = (generator: WordGenerator, size?: number) => {
                let generated: string[] = [];
                for (let i = 0; i < (size ?? 5); i++) {
                    generated.push(generator.generate());
                }

                return generated;
            };
            const calculateColisions = () => {
                collisions = generated.length - generated.filter((x) => !forbidden.includes(x)).length;
            };
            const generationOk = () => collisions === 0;

            let generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            const complexGenerator = new WordGenerator({ length: 18, letters: true, capitals: true, special: true });
            generated = tryFrequenceGeneration(complexGenerator, 10);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            const veryComplexGenerator = new WordGenerator({
                length: collisions * 6,
                letters: true,
                capitals: true,
                special: true,
                numbers: true
            });
            generated = tryFrequenceGeneration(veryComplexGenerator, 20);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }
            reject();
        });
    }
}
