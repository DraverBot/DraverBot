import { Client, Collection, Message, StringSelectMenuBuilder, TextChannel, User } from 'discord.js';
import { DatabaseTables, polls } from '../typings/database';
import query from '../utils/query';
import { Poll } from '../structures/Poll';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { dbBool, row, sqliseString } from '../utils/toolbox';

export class PollsManager {
    private client: Client;
    private cache: Collection<number, Poll> = new Collection();

    constructor(client: Client) {
        this.client = client;

        this.init();
    }

    public async create({
        question,
        by,
        channel,
        choices,
        time,
        choosable = 1
    }: {
        question: string;
        by: User;
        channel: TextChannel;
        choices: string[];
        time: number;
        choosable?: number;
    }) {
        const options = choices.map((x, i) => ({ name: x, count: 0, id: i }));
        if (options.length > 25) return 'options is too large';
        if (options.some((x) => x.name.length > 100)) return 'one of names is too large';
        const endsAt = Date.now() + time;

        const selector = new StringSelectMenuBuilder()
            .setCustomId('poll-selector')
            .setMaxValues(choosable)
            .setOptions(
                options.map((x, i) => ({ label: `Option n°${i + 1}`, value: x.id.toString(), description: x.name }))
            );
        const msg = (await channel
            .send({
                embeds: [replies.pollEmbed(by, question, endsAt, options)],
                components: [row<StringSelectMenuBuilder>(selector)]
            })
            .catch(log4js.trace)) as Message<true>;
        if (!msg) return 'message not sent';
        const insertion = await query(
            `INSERT INTO ${
                DatabaseTables.Polls
            } ( guild_id, message_id, channel_id, started_by, endsAt, participants, choices, question, choosable ) VALUES ( "${
                channel.guild.id
            }", "${msg.id}", "${channel.id}", "${by.id}", "${endsAt}", "[]", "${JSON.stringify(options).replace(
                /"/g,
                '\\"'
            )}", "${sqliseString(question)}", '${choosable}')`
        );

        if (!insertion) return 'invalid insertion';
        const poll = new Poll(this.client, {
            guild_id: channel.guild.id,
            channel_id: channel.id,
            message_id: msg.id,
            choices: options,
            participants: [],
            endsAt,
            question,
            poll_id: insertion.insertId,
            started_by: by.id,
            ended: false,
            choosable
        });

        this.cache.set(poll.data.poll_id, poll);
    }
    public isPoll(poll_id: number) {
        return this.cache.has(poll_id);
    }
    public getPoll(poll_id: number) {
        return this.cache.get(poll_id);
    }
    public end(poll_id: number) {
        if (!this.isPoll(poll_id)) return 'invalid poll';
        const poll = this.getPoll(poll_id);

        if (poll.ended) return 'poll already ended';
        poll.end();
    }
    public getPollsList(guildId: string) {
        return this.cache.filter((x) => x.data.guild_id == guildId);
    }

    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Polls} ( guild_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, started_by VARCHAR(255) NOT NULL, poll_id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT, endsAt INTEGER(255) NOT NULL, participants LONGTEXT, choices LONGTEXT, question VARCHAR(255) NOT NULL, ended TINYINT(1) NOT NULL DEFAULT "0")`
        );
    }
    private async fillCache() {
        const datas = await query<polls<true>>(`SELECT * FROM ${DatabaseTables.Polls}`);
        if (!datas) return log4js.trace(`No data from database for polls manager`);

        datas
            .filter((x) => !dbBool(x.ended))
            .forEach((data) => {
                const poll = new Poll(this.client, {
                    question: data.question,
                    guild_id: data.guild_id,
                    channel_id: data.channel_id,
                    message_id: data.message_id,
                    started_by: data.started_by,
                    endsAt: parseInt(data.endsAt),
                    poll_id: data.poll_id,
                    choices: JSON.parse(data.choices),
                    participants: JSON.parse(data.participants),
                    ended: dbBool(data.ended),
                    choosable: data.choosable
                });

                this.cache.set(data.poll_id, poll);
            });
    }
    private async init() {
        await this.checkDb();
        this.fillCache();
    }
}
