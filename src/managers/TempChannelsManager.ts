import { configsManager } from '../cache/managers';
import { ChannelType, Client, Collection, Guild, GuildMember, VoiceState } from 'discord.js';
import { TempChannel } from '../structures/TempChannel';
import query from '../utils/query';
import { DatabaseTables, tempChannels } from '../typings/database';
import { log4js } from 'amethystjs';
import { sqliseString } from '../utils/toolbox';

export class TempChannelsManager {
    private cache: Collection<number, TempChannel> = new Collection();
    private panelIds: tempChannels[] = [];
    private client: Client;

    constructor(client: Client) {
        this.client = client;

        this.start();
    }

    public delete(id: number) {
        this.cache.delete(id);
    }

    public getInstances(guild?: string) {
        return this.cache.filter((x) => (!!guild ? x.options.guild_id === guild : true));
    }
    public async createPanel({
        guild,
        parent,
        name,
        channel
    }: {
        guild: Guild;
        parent: string;
        name: string;
        channel: string;
    }): Promise<tempChannels | 'already exists' | 'nothing'> {
        return new Promise(async (resolve) => {
            if (this.findPanel(guild, channel)) return resolve('already exists');
            const res = await query(
                `INSERT INTO ${
                    DatabaseTables.TempChannels
                } ( guild_id, user_id, channel_id, type, parent, name ) VALUES ('${
                    guild.id
                }', '', '${channel}', 'panel', '${parent}', "${sqliseString(name)}")`
            );
            if (!res) return resolve('nothing');
            this.panelIds.push({
                user_id: '',
                guild_id: guild.id,
                channel_id: channel,
                parent,
                type: 'panel',
                name,
                id: res.insertId
            });

            return resolve(this.findPanel(guild, channel));
        });
    }
    public getPanelById(id: number) {
        return this.panelIds.find((x) => x.id === id);
    }
    public async deletePanel(id: number) {
        const panel = this.getPanelById(id);
        if (!panel) return 'nopanel';

        const deletePanel = () => {
            query(`DELETE FROM ${DatabaseTables.TempChannels} WHERE id='${id}'`);
            this.panelIds = this.panelIds.filter((x) => x.id !== id);
        };
        const guild =
            this.client.guilds.cache.get(panel.guild_id) ??
            (await this.client.guilds.fetch(panel.guild_id).catch(log4js.trace));
        if (!guild) return deletePanel();

        guild.channels.delete(panel.channel_id).catch(log4js.trace);
        deletePanel();

        return true;
    }
    public getPanels(guild: string) {
        return this.panelIds.filter((x) => x.guild_id === guild);
    }
    public findPanel(guild: Guild, channel: string) {
        return this.panelIds.find((x) => x.guild_id === guild.id && x.channel_id === channel);
    }
    private async checkDb() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.TempChannels} ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, type VARCHAR(255), parent VARCHAR(255), name VARCHAR(255), id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT )`
        );
        return true;
    }
    private async fillCache() {
        const res = await query<tempChannels>(`SELECT * FROM ${DatabaseTables.TempChannels}`);
        if (!res) return;

        res.forEach((x) => {
            if (x.type === 'panel') return this.panelIds.push(x);
            this.cache.set(x.id, new TempChannel(this.client, this, x));
        });
        return true;
    }
    private replaceName(str: string, user: GuildMember) {
        return str.replace(/{user}/g, user?.nickname ?? user.user.username);
    }
    private async createCustom(guild: Guild, member: GuildMember, aft: VoiceState) {
        const createData = this.findPanel(guild, aft.channel?.id);
        const channel = await guild.channels
            .create({
                name: this.replaceName(createData.name, member),
                type: ChannelType.GuildVoice,
                userLimit: 99,
                parent: createData.parent.length > 0 ? createData.parent : null
            })
            .catch(log4js.trace);
        if (!channel) {
            aft.disconnect().catch(log4js.trace);
            return;
        }
        aft.setChannel(channel).catch(log4js.trace);
        const res = await query(
            `INSERT INTO ${DatabaseTables.TempChannels} ( guild_id, user_id, channel_id, name, parent, type ) VALUES ('${guild.id}', '${member.id}', '${channel.id}', '', '', 'channel')`
        );
        if (!res) return channel.delete().catch(log4js.trace);

        this.cache.set(
            res.insertId,
            new TempChannel(this.client, this, {
                channel_id: channel.id,
                guild_id: guild.id,
                user_id: member.id,
                name: '',
                type: 'channel',
                parent: createData.parent,
                id: res.insertId
            })
        );
    }
    private event() {
        this.client.on('voiceStateUpdate', async (bef, aft) => {
            const guild = aft.guild;
            const member = aft.member;
            if (member.user.bot) return;

            if ((!bef.channel && aft.channel) || bef.channelId !== aft.channelId) {
                if (!configsManager.getValue(guild.id, 'temp_channels')) return;
                const createData = this.findPanel(guild, aft.channel?.id);
                if (createData) {
                    this.createCustom(guild, member, aft);
                }
            }
            if ((bef.channel && !aft.channel) || bef.channelId !== aft.channelId) {
                const channelData = this.cache.find((x) => x.options.channel_id === bef.channelId);
                if (!channelData || channelData.options.user_id !== member.id) return;

                channelData.delete();
            }
        });
    }
    private async start() {
        await this.checkDb();
        await this.fillCache();
        this.event();
    }
}
