import { AmethystClient, log4js } from 'amethystjs';
import { CounterId, counters, DatabaseTables, DefaultQueryResult } from '../typings/database';
import { ChannelType, Guild, GuildChannel } from 'discord.js';
import { hardLog, notNull, removeKey, sqliseString } from '../utils/toolbox';
import query from '../utils/query';
import { modulesManager } from '../cache/managers';

export class Counter {
    private cache: counters<false>;
    private client: AmethystClient;
    private guild: Guild;
    private _channels: { id: CounterId; name: string; enabled: boolean; channel: GuildChannel }[] = [];
    private bulking = false;

    constructor(client: AmethystClient, options: counters<true> | Omit<counters<true>, 'id'>, autoStart = true) {
        this.client = client;
        this.cache = Counter.parse(options);

        if (autoStart) this.start();
    }

    public get channels() {
        return this._channels;
    }
    public get info() {
        return this.cache;
    }
    public setId(id: number) {
        this.cache.id = id;
        return this;
    }
    public bulk() {
        if (!this.bulking) this.bulking = true;
        return this;
    }
    public bulkUpdate() {
        if (this.bulking) this.bulking = false;
        this.save();
    }

    public setName(id: CounterId, name: string) {
        const _index = this._channels.findIndex((x) => x.id === id);
        this._channels[_index].name = name;

        const index = this.cache.channels.findIndex((x) => x.id === id);
        this.cache.channels[index].name = name;

        if (this._channels[_index].enabled) {
            this.update(id, this.getCount(id));
        }

        this.save();
        return this;
    }
    public getCount(id: CounterId) {
        const values = [
            this.guild.members.cache.size,
            this.guild.members.cache.filter((x) => !x.user.bot).size,
            this.guild.members.cache.filter((x) => x.user.bot).size
        ];
        return values[id ?? 0];
    }
    public get query() {
        const values = ((opt: counters<true>) => {
            if (!notNull(opt.id)) return removeKey(opt, 'id');
            return opt;
        })(this.toJSON());
        return `(${Object.keys(values).join(', ')}) VALUES (${Object.values(values)
            .map((x) => `"${sqliseString(x?.toString())}"`)
            .join(', ')})`;
    }
    public enable(id: CounterId, channelId: string, name?: string) {
        const channel = {
            id,
            channel: channelId,
            enabled: true,
            name: (() => {
                if (name) return name;
                return ['Membres : {cmp}', 'Utilisateurs : {cmp}', 'Bots : {cmp}'][id];
            })()
        };
        const index = this.cache.channels.findIndex((x) => x.id === id);

        if (index >= 0) this.cache.channels[index] = channel;
        else this.cache.channels.push(channel);

        this.clean();
        this.save();
    }
    public disable(id: CounterId, channelId: string, name?: string) {
        const channel = {
            id,
            channel: channelId,
            enabled: false,
            name: (() => {
                if (name) return name;
                return ['Membres : {cmp}', 'Utilisateurs : {cmp}', 'Bots : {cmp}'][id];
            })()
        };
        const index = this.cache.channels.findIndex((x) => x.id === id);

        if (index >= 0) this.cache.channels[index] = channel;
        else this.cache.channels.push(channel);

        this.clean();
        this.save();
    }
    public save(): Promise<DefaultQueryResult> {
        this._channels = this.cache.channels
            ? this.cache.channels.map((x) => ({
                  name: x.name,
                  enabled: x.enabled,
                  id: x.id,
                  channel: this._channels.find((y) => y.id === x.id)?.channel
              }))
            : this._channels;

        if (this.bulking) return;
        return query(`REPLACE INTO ${DatabaseTables.Counters} ${this.query}`);
    }
    public update(id: CounterId, count: number) {
        const channel = this._channels.find((x) => x.enabled && x.id === id);
        if (!channel) return false;

        if (!modulesManager.enabled(channel.channel?.guild?.id, 'counters')) return false;

        const name = channel.name.replace(/{cmp}/g, count.toLocaleString());
        channel?.channel?.setName(name, `Compteurs automatiques`)?.catch(log4js.trace);

        return true;
    }
    private clean() {
        this.cache.channels = this.cache.channels.filter((x) => !isNaN(x.id) && notNull(x.name));
    }
    public async setup(): Promise<number> {
        await this.guild.members.fetch().catch(log4js.trace);

        return new Promise((resolve, reject) => {
            const tryer = async (tries = 0) => {
                if (tries === 3) {
                    hardLog(this.client, `Setup failed for guild ${this.guild.id} (counters)`, 'Error');
                    reject(false);
                    return;
                }

                const retry = () => setTimeout(() => tryer(tries + 1), 5000);

                const category = !notNull(this.cache.category)
                    ? null
                    : await this.guild.channels.fetch(this.cache.category).catch(log4js.trace);
                if (!category) {
                    const categoryChannel = await this.guild.channels
                        .create({
                            name: `📊 • Statistiques`,
                            type: ChannelType.GuildCategory,
                            permissionOverwrites: [
                                {
                                    id: this.guild.id,
                                    allow: ['ViewChannel'],
                                    deny: [
                                        'Connect',
                                        'Speak',
                                        'SendMessages',
                                        'CreatePublicThreads',
                                        'CreatePrivateThreads',
                                        'SendTTSMessages',
                                        'AddReactions'
                                    ]
                                }
                            ]
                        })
                        .catch(log4js.trace);
                    if (!categoryChannel) return retry();
                    this.cache.category = categoryChannel.id;
                }

                if (this._channels.length)
                    await Promise.all(
                        this._channels.map((channel) => channel?.channel?.delete?.()?.catch?.(log4js.trace))
                    );
                this._channels = await Promise.all(
                    this.cache.channels.map(async (x) => ({
                        ...x,
                        channel: x.enabled
                            ? ((await this.guild.channels
                                  .create({
                                      name: x.name?.replace?.(/{cmp}/g, this.getCount(x.id).toLocaleString()),
                                      type: this.cache.channelType,
                                      parent: this.cache.category
                                  })
                                  .catch(log4js.trace)) as GuildChannel)
                            : null
                    }))
                );

                this._channels?.map?.(({ channel }, i) => channel?.setPosition?.(i));
                this.cache.channels = this._channels?.map?.((x) => ({ ...x, channel: x.channel?.id }));

                const res = await this.save();
                const id = res?.insertId;
                return resolve(notNull(id) ? id : this.cache.id);
            };

            tryer();
        });
    }
    public findChannel(id: CounterId) {
        return this._channels.find((x) => x.id === id);
    }

    public static parse(options: counters<true> | Omit<counters<true>, 'id'>): counters<false> {
        return {
            ...options,
            channels: JSON.parse(options.channels)
        } as counters<false>;
    }
    public toJSON(): counters<true> {
        return {
            ...this.cache,
            channels: JSON.stringify(this.cache.channels)
        };
    }

    public async start() {
        if (this.guild) return true;

        this.guild = await this.client.guilds.fetch(this.cache.guild_id);
        if (!this.guild) return hardLog(this.client, `No guild found for counter ${this.cache.id}`, 'Unexpected');

        this._channels = (
            await Promise.all(
                this.cache.channels.map(async (x) => ({
                    ...x,
                    channel: (await this.guild.channels.fetch(x.channel).catch(log4js.trace)) as GuildChannel
                }))
            )
        ).filter((x) => !!x.channel);
        return true;
    }
}
