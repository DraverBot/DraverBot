import { Client, Guild, GuildMember, VoiceChannel } from 'discord.js';
import { DatabaseTables, tempChannels } from '../typings/database';
import { log4js } from 'amethystjs';
import query from '../utils/query';
import { TempChannelsManager } from '../managers/TempChannelsManager';

export class TempChannel {
    private _options: tempChannels;
    private client: Client;
    private guild: Guild;
    private member: GuildMember;
    private channel: VoiceChannel;
    private manager: TempChannelsManager;

    constructor(client: Client, manager: TempChannelsManager, options: tempChannels) {
        this._options = options;
        this.client = client;
        this.manager = manager;

        this.start();
    }

    public get options() {
        return this._options;
    }
    public delete() {
        query(`DELETE FROM ${DatabaseTables.TempChannels} WHERE id='${this._options.id}'`);
        this.manager.delete(this._options.id);
        this.channel.delete().catch(log4js.trace);
    }
    private async start() {
        this.guild =
            this.client.guilds.cache.get(this._options.guild_id) ??
            ((await this.client.guilds.fetch(this._options.guild_id).catch(log4js.trace)) as Guild);
        if (!this.guild) return;

        this.channel = (this.guild.channels.cache.get(this._options.channel_id) ??
            (await this.guild.channels.fetch(this._options.channel_id).catch(log4js.trace))) as VoiceChannel;
        if (!this.channel) return;

        this.member =
            this.guild.members.cache.get(this._options.user_id) ??
            ((await this.guild.members.fetch(this._options.user_id).catch(log4js.trace)) as GuildMember);
        if (!this.member) return this.delete();
    }
}
