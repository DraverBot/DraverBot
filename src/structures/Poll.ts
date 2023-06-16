import { ButtonInteraction, Client, ComponentType, Guild, InteractionCollector, Message, TextChannel } from 'discord.js';
import { polls } from '../typings/database';
import { log4js } from 'amethystjs';

export class Poll {
    private data: polls;
    private client: Client;
    private message: Message<true>;
    private channel: TextChannel;
    private guild: Guild;
    private initiated = false;
    private collector: InteractionCollector<ButtonInteraction<'cached'>>;

    constructor(client: Client, data: polls) {
        this.data = data;
        this.client = client;
        this.init();
    }

    private async init() {
        await this.client.guilds.fetch();
        const guild = this.client.guilds.cache.get(this.data.guild_id);

        if (!guild) return log4js.trace(`No guild found to init poll ${this.data.poll_id}`);
        this.guild = guild;

        const channel = (await this.guild.channels.fetch(this.data.channel_id).catch(log4js.trace)) as TextChannel;
        if (!channel) return log4js.trace(`No channel found to init poll ${this.data.poll_id}`);
        this.channel = channel;

        await this.channel.messages.fetch();
        const message = this.channel.messages.cache.get(this.data.message_id);
        if (!message) return log4js.trace(`No message found to init poll ${this.data.poll_id}`);

        this.message = message;

        const collector = this.message.createMessageComponentCollector({
            componentType: ComponentType.Button
        })

        this.collector = collector;
        this.initiated = true;
    }
}
