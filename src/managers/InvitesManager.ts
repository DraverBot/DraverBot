import { modulesManager, configsManager } from '../cache/managers';
import { Client, Collection, TextChannel } from 'discord.js';
import { init } from '@androz2091/discord-invites-tracker';
import { DatabaseTables, invitations } from '../typings/database';
import query from '../utils/query';
import { log4js } from 'amethystjs';
import { replaceInvitesVariables } from '../utils/vars';

export class InvitesManager {
    private client: Client;
    private tracker: ReturnType<typeof init>;
    private cache: Collection<string, invitations> = new Collection();

    constructor(client: Client) {
        this.client = client;
        this.tracker = init(this.client, {
            fetchAuditLogs: true,
            fetchGuilds: true,
            fetchVanity: true
        });

        this.start();
    }

    public async addInvited(guild_id: string, user_id: string, member_id: string) {
        const code = this.getCode({ guild_id, user_id });
        const existed = this.cache.has(code);
        const stats = this.getStats(guild_id, user_id);

        if (!stats.invited.includes(member_id)) stats.invited.push(member_id);
        this.cache.set(code, stats);

        await query(
            existed
                ? `UPDATE ${DatabaseTables.Invites} SET invited='${JSON.stringify(
                      stats.invited
                  )}' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
                : `INSERT INTO ${DatabaseTables.Invites} (guild_id, user_id, invited) VALUES ('${guild_id}', '${user_id}', '["${member_id}"]')`
        );
        return true;
    }
    public async addInvites(
        guild_id: string,
        user_id: string,
        ...invites: { type: 'fakes' | 'total' | 'leaves' | 'bonus'; amount: number }[]
    ) {
        const code = this.getCode({ guild_id, user_id });
        const exists = this.cache.has(code);
        const stats = this.getStats(guild_id, user_id);

        invites.forEach((invite) => {
            stats[invite.type] += invite.amount;
        });

        this.cache.set(code, stats);

        await query(
            exists
                ? `UPDATE ${DatabaseTables.Invites} SET ${invites
                      .map((x) => `${x.type}='${x.amount}'`)
                      .join(', ')} WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
                : `INSERT INTO ${DatabaseTables.Invites} ( guild_id, user_id, invited, ${invites
                      .map((x) => x.type)
                      .join(', ')}) VALUES ('${guild_id}', '${user_id}', '${JSON.stringify(stats.invited)}', ${invites
                      .map((x) => `'${stats[x.type]}'`)
                      .join(', ')})`
        );
        return true;
    }
    public resetUser(guild_id: string, user_id: string, options?: { resetInvitations?: boolean }) {
        const code = this.getCode({ guild_id, user_id });
        const data = this.getStats(guild_id, user_id);

        if (!options?.resetInvitations) {
            this.cache.set(code, {
                ...data,
                total: 0,
                fakes: 0,
                leaves: 0,
                bonus: 0
            });

            query(
                `UPDATE ${DatabaseTables.Invites} SET total='0', fakes='0', leaves='0' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
            );
        } else {
            this.cache.delete(code);
            query(`DELETE FROM ${DatabaseTables.Invites} WHERE guild_id='${guild_id}' AND user_id='${user_id}'`);
        }
    }
    public resetGuild(guild_id: string, options?: { resetInvitations?: boolean }) {
        if (!options?.resetInvitations) {
            this.cache.forEach((value, key) => {
                if (value.guild_id === guild_id) {
                    this.cache.set(key, {
                        ...value,
                        total: 0,
                        fakes: 0,
                        leaves: 0
                    });
                }
            });

            query(`UPDATE ${DatabaseTables.Invites} SET total='0', fakes='0', leaves='0' WHERE guild_id='${guild_id}'`);
        } else {
            this.cache = this.cache.filter((x) => x.guild_id !== guild_id);
            query(`DELETE FROM ${DatabaseTables.Invites} WHERE guild_id='${guild_id}'`);
        }
    }
    public getLeaderboard(guild: string) {
        return this.getGuild(guild).sort((a, b) => b.total - (b.fakes + b.leaves) - (a.total - (a.fakes + a.leaves)));
    }
    public getStats(guild_id: string, user_id: string): invitations {
        return this.cache.get(this.getCode({ guild_id, user_id })) ?? this.defaultValues(guild_id, user_id);
    }
    public isInvitedBy(guild_id: string, user_id: string, member_id: string) {
        return this.getStats(guild_id, user_id).invited.includes(member_id);
    }
    public getGuild(guild: string) {
        return this.cache.filter((x) => x.guild_id === guild);
    }

    private defaultValues(guild_id: string, user_id: string): invitations {
        return {
            guild_id,
            user_id,
            invited: [],
            fakes: 0,
            leaves: 0,
            total: 0,
            bonus: 0
        };
    }
    private getCode({ guild_id, user_id }: { guild_id: string; user_id: string }) {
        return `${guild_id}.${user_id}`;
    }
    private async checkDb() {
        query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Invites} ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, invited LONGTEXT, total VARCHAR(255) NOT NULL DEFAULT '0', fakes VARCHAR(255) NOT NULL DEFAULT '0', leaves VARCHAR(255) NOT NULL DEFAULT '0', bonus VARCHAR(255) NOT NULL DEFAULT '0')`
        );
        return true;
    }
    private async fillCache() {
        const res = await query<invitations<true>>(`SELECT * FROM ${DatabaseTables.Invites}`);
        if (!res) return;

        res.forEach((data) => {
            this.cache.set(this.getCode(data), {
                ...data,
                invited: JSON.parse(data.invited),
                fakes: parseInt(data.fakes),
                total: parseInt(data.total),
                leaves: parseInt(data.leaves),
                bonus: parseInt(data.bonus)
            });
        });
    }
    private event() {
        this.client.on('guildMemberRemove', async (member) => {
            const guild = member.guild;
            if (!modulesManager.enabled(guild.id, 'invitations') || member.user.bot) return;

            const inviterID = this.getGuild(guild.id).find((x) => x.invited.includes(member.id));
            const unknownCase = async () => {
                const channelId = configsManager.getValue(guild.id, 'invite_channel') as string;
                if (!channelId) return;

                const channel = (guild.channels.cache.get(channelId) ??
                    (await guild.channels.fetch(channelId).catch(log4js.trace))) as TextChannel;
                if (!channel) return;

                const template = configsManager.getValue(guild.id, 'invite_unknown_message_leave') as string;
                if (!template) return;
                const message = replaceInvitesVariables({
                    member,
                    guild,
                    inviter: null,
                    userData: null,
                    replaceInviter: false,
                    msg: template
                });
                if (!message) return;
                if (channel) channel.send(message).catch(log4js.trace);
            };
            if (!inviterID) return unknownCase();

            const data = this.getStats(guild.id, inviterID.user_id);
            this.addInvites(guild.id, inviterID.user_id, { type: 'leaves', amount: 1 }, { type: 'total', amount: 1 });

            const inviter =
                guild.members.cache.get(inviterID.user_id) ??
                (await guild.members.fetch(inviterID.user_id)?.catch(log4js.trace));
            if (!inviter) return unknownCase();

            const channelId = configsManager.getValue(guild.id, 'invite_channel') as string;
            if (!channelId) return;

            const channel = (guild.channels.cache.get(channelId) ??
                (await guild.channels.fetch(channelId).catch(log4js.trace))) as TextChannel;
            if (!channel) return;

            const template = configsManager.getValue(guild.id, 'invite_normal_message_leave') as string;
            if (!template) return;
            const message = replaceInvitesVariables({
                member,
                guild,
                inviter: inviter.user,
                userData: data,
                replaceInviter: true,
                msg: template
            });
            if (!message) return;
            if (channel) channel.send(message).catch(log4js.trace);
        });
        this.tracker.on('guildMemberAdd', async (member, type, invite) => {
            const guild = member.guild;
            if (!modulesManager.enabled(guild.id, 'invitations') || type === 'permissions' || member.user.bot) return;

            if (type === 'normal') {
                if (this.isInvitedBy(guild.id, invite.inviter.id, member.id)) {
                    await this.addInvites(
                        guild.id,
                        invite.inviter.id,
                        { type: 'fakes', amount: 1 },
                        { type: 'total', amount: 1 }
                    );
                } else {
                    await this.addInvites(guild.id, invite.inviter.id, { type: 'total', amount: 1 });
                }
                await this.addInvited(guild.id, invite.inviter.id, member.id);
            }

            const id = configsManager.getValue(guild.id, 'invite_channel') as string;
            if (!id) return;
            const channel = (guild.channels.cache.get(id) ??
                (await guild.channels.fetch(id).catch(log4js.trace))) as TextChannel;
            if (!channel) return;

            if (type === 'vanity' || type === 'unknown' || (type === 'normal' && !invite.inviter)) {
                const template = configsManager.getValue(
                    guild.id,
                    type === 'vanity' ? 'invite_vanity_message_join' : 'invite_unknown_message_join'
                ) as string;
                if (!template) return;
                const message = replaceInvitesVariables({
                    msg: template,
                    guild,
                    member,
                    replaceInviter: false,
                    userData: {} as any,
                    inviter: invite.inviter
                });

                if (message) channel.send(message).catch(log4js.trace);
                return;
            }

            const userData = this.getStats(guild.id, invite?.inviter?.id);

            const template = configsManager.getValue(guild.id, 'invite_normal_message_join') as string;
            if (!template) return;
            const msg = replaceInvitesVariables({
                member,
                guild,
                inviter: invite.inviter,
                msg: template,
                replaceInviter: true,
                userData
            });
            if (!msg) return;

            if (channel) channel.send(msg).catch(log4js.trace);
        });
    }
    private async start() {
        await this.checkDb();
        await this.fillCache();
        this.event();
    }
}
