import { AmethystClient, log4js } from 'amethystjs';
import { Counter } from '../structures/Counter';
import { CategoryChannel, ChannelType, Client, Collection, Guild, GuildMember } from 'discord.js';
import query from '../utils/query';
import { CounterId, counters, DatabaseTables } from '../typings/database';
import { notNull } from '../utils/toolbox';
import { langResolvable } from '../typings/core';
import { translator } from '../translate/translate';

export class CountersManager {
    private client: AmethystClient;
    private cache: Collection<number, Counter>;

    constructor(client: AmethystClient) {
        this.client = client;

        this.start();
    }

    public data(lang: langResolvable, translate = true) {
        if (!translate) {
            return [
                CounterId.All, CounterId.Humans, CounterId.Bots
            ].map((x) => ({
                name: null,
                description: null,
                id: x
            }))
        }
        return [
            {
                name: translator.translate('contents.global.counters.members.name', lang),
                description: translator.translate('contents.global.counters.members.description', lang),
                id: CounterId.All
            },
            {
                name: translator.translate('contents.global.counters.users.name', lang),
                description: translator.translate('contents.global.counters.users.description', lang),
                id: CounterId.Humans
            },
            {
                name: translator.translate('contents.global.counters.bots.name', lang),
                description: translator.translate('contents.global.counters.bots.description', lang),
                id: CounterId.Bots
            }
        ];
    }
    public getCounter(guildId: string) {
        return this.cache.find((x) => x.info.guild_id === guildId);
    }
    public async create({
        guild,
        channels,
        channelType,
        category
    }: {
        guild: Guild;
        category?: string | CategoryChannel;
        channels: { id: CounterId; name: string }[];
        channelType: ChannelType.GuildText | ChannelType.GuildVoice;
    }) {
        if (!!this.getCounter(guild.id)) return false;
        const categoryId = category?.valueOf();

        const counter = new Counter(
            this.client,
            {
                guild_id: guild.id,
                category: categoryId,
                channelType,
                channels: JSON.stringify(channels.map((x) => ({ ...x, enabled: true, channel: null })))
            },
            false
        );
        await counter.start();

        const id = await counter.setup();
        if (!notNull(id)) return 'failed';

        counter.setId(id);
        this.cache.set(id, counter);

        return counter;
    }

    private async checkDatabase() {
        await query(`CREATE TABLE IF NOT EXISTS ${DatabaseTables.Counters} (
            guild_id VARCHAR(255) NOT NULL,
            channels LONGTEXT NOT NULL DEFAULT '{}',
            category VARCHAR(255) NOT NULL,
            id BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
            channelType VARCHAR(255) NOT NULL
        )`);
        return true;
    }
    private async start() {
        await this.checkDatabase();

        if (!this.client.readyAt) {
            (this.client as unknown as Client).once('ready', this.start.bind(this));
            return;
        }
        this.cache = new Collection(
            (await query<counters<true>>(`SELECT * FROM ${DatabaseTables.Counters}`)).map((x) => [
                x.id,
                new Counter(this.client, x)
            ])
        );

        const callback = async ({ guild, user }: GuildMember) => {
            const counter = this.getCounter(guild.id);
            if (!counter) return;

            await guild.members.fetch().catch(log4js.trace);

            counter.update(CounterId.All, guild.members.cache.size);

            if (user.bot) {
                counter.update(CounterId.Bots, guild.members.cache.filter((x) => x.user.bot).size);
            } else {
                counter.update(CounterId.Humans, guild.members.cache.filter((x) => !x.user.bot).size);
            }
        };
        this.client.on('guildMemberAdd', callback.bind(this));
        this.client.on('guildMemberRemove', callback.bind(this));
    }
}
