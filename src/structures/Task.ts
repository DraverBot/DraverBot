import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    Guild,
    GuildMember,
    InteractionCollector,
    Message,
    TextChannel
} from 'discord.js';
import { DatabaseTables, taskState, tasks } from '../typings/database';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { basicEmbed, buildButton, confirm, notNull, row } from '../utils/toolbox';
import query from '../utils/query';
import { ButtonIds } from '../typings/buttons';

export class Task {
    private guild_id: string;
    private channel_id: string;
    private message_id: string;
    private guild: Guild;
    private channel: TextChannel;
    private message: Message<true>;

    private opened_by: string;
    private startedAt: number;
    private deadline: number | null;
    private name: string;
    private description: string;
    private img: string | null;
    private state: taskState;
    private assignees: string[];
    private id: number;
    private collector: InteractionCollector<ButtonInteraction>;

    private client: Client;

    constructor(client: Client, data: tasks<true>) {
        this.client = client;

        this.id = data.id;
        this.guild_id = data.guild_id;
        this.assignees = JSON.parse(data.assignees) as string[];
        this.opened_by = data.opened_by;
        this.name = data.name;
        this.description = data.description;
        this.img = data.image === 'null' ? null : data.image ?? null;
        this.startedAt = parseInt(data.startedAt);
        this.deadline = parseInt(data.deadline) === 0 ? null : parseInt(data.deadline) ?? null;
        this.channel_id = data.channel_id;
        this.message_id = data.message_id;
        this.state = data.state;

        this.start();
    }
    public get data(): tasks {
        return {
            name: this.name,
            description: this.description,
            image: this.img,
            deadline: this.deadline,
            startedAt: this.startedAt,
            state: this.state,
            assignees: this.assignees,
            opened_by: this.opened_by,
            id: this.id,
            guild_id: this.guild_id,
            channel_id: this.channel_id,
            message_id: this.message_id
        };
    }

    private edit(closeReason?: 'deadline crossed' | 'someone closed') {
        let embed: EmbedBuilder;
        if (this.state === 'closed') {
            embed = replies.tasks.closed(this.data, closeReason);
        } else if (this.state === 'done') {
            embed = replies.tasks.done(this.data);
        } else if (this.state === 'pending') {
            embed = replies.tasks.pending(this.data);
        } else {
            embed = replies.tasks.working(this.data);
        }

        this.message
            .edit({
                embeds: [embed],
                components: this.components
            })
            .catch(log4js.trace);
    }
    public get ended() {
        return this.state === 'closed' || this.state === 'done';
    }
    public close(userInputed = true) {
        if (this.state === 'closed') return 'already closed';
        if (this.state === 'done') return 'cannot close';

        this.state = 'closed';
        query(`UPDATE ${DatabaseTables.Tasks} SET state='${this.state}' WHERE id='${this.id}'`);

        this.edit(userInputed ? 'someone closed' : 'deadline crossed');
        if (this.collector) this.collector.stop();
    }
    public isAssigned(userId: string) {
        return this.assignees.includes(userId);
    }
    public assign(userId: string) {
        if (this.ended) return 'cannot assign someone';
        if (this.isAssigned(userId)) return 'already assigned';

        if (this.state === 'pending') this.state = 'working';
        this.assignees.push(userId);
        query(
            `UPDATE ${DatabaseTables.Tasks} SET assignees='${JSON.stringify(this.assignees)}', state='${
                this.state
            }' WHERE id='${this.id}'`
        );
        this.edit();

        return 'ok';
    }
    public removeAssignation(userId: string) {
        if (this.ended) return 'cannot unassign someone';
        if (!this.isAssigned(userId)) return 'not assigned';

        this.assignees = this.assignees.filter((x) => x !== userId);
        if (this.assignees.length === 0) {
            this.pend();
        }
        query(`UPDATE ${DatabaseTables.Tasks} SET assignees='${JSON.stringify(this.assignees)}' WHERE id='${this.id}'`);
        this.edit();

        return 'ok';
    }
    public pend() {
        if (this.state !== 'working') return 'cannot pend this';

        this.state = 'pending';
        query(`UPDATE ${DatabaseTables.Tasks} SET state='${this.state}' WHERE id='${this.id}'`);

        this.edit();

        return 'ok';
    }
    public done() {
        if (this.state !== 'working') return 'cannot do this';

        this.state = 'done';
        query(`UPDATE ${DatabaseTables.Tasks} SET state='${this.state}' WHERE id='${this.id}'`);
        this.edit();

        if (this.collector) this.collector.stop();

        return 'ok';
    }
    private get components(): ActionRowBuilder<ButtonBuilder>[] {
        if (this.state === 'done' || this.state === 'closed') {
            return [];
        } else if (this.state === 'pending') {
            return [
                row(
                    buildButton({ label: 'Assigner', buttonId: 'TaskAssign', style: 'Secondary' }),
                    buildButton({ label: 'Fermer', style: 'Danger', buttonId: 'TaskClose' })
                )
            ];
        } else {
            return [
                row(
                    buildButton({ label: 'Assigner', buttonId: 'TaskAssign', style: 'Secondary' }),
                    buildButton({ label: 'Se retirer', buttonId: 'TaskUnAssign', style: 'Primary' }),
                    buildButton({ label: 'Terminer', buttonId: 'TaskDone', style: 'Success' }),
                    buildButton({ label: 'Fermer', style: 'Danger', buttonId: 'TaskClose' })
                )
            ];
        }
    }
    private async start() {
        await this.client.guilds.fetch().catch(log4js.trace);
        this.guild = this.client.guilds.cache.get(this.guild_id);
        if (!this.guild) return log4js.trace('No guild found for a task');

        this.channel = (await this.guild.channels.fetch(this.channel_id).catch(log4js.trace)) as TextChannel;
        if (!this.channel) return log4js.trace('No channel found for a task');

        await this.channel.messages.fetch().catch(log4js.trace);
        this.message = this.channel.messages.cache.get(this.message_id);
        if (!this.message) return log4js.trace('No message found for a task');

        this.edit();
        if (!this.ended) {
            this.collector = this.message.createMessageComponentCollector({ componentType: ComponentType.Button });
            this.collector.on('collect', async (ctx) => {
                if (ctx.customId === ButtonIds.TaskAssign) {
                    if (this.isAssigned(ctx.user.id)) {
                        ctx.reply({
                            ephemeral: true,
                            embeds: [
                                basicEmbed(ctx.user, { evoker: ctx.guild })
                                    .setTitle('Assigné')
                                    .setDescription(`Vous êtes déjà assigné à cette tâche`)
                            ]
                        }).catch(log4js.trace);
                        return;
                    }
                    this.assign(ctx.user.id);

                    ctx.reply({
                        embeds: [
                            basicEmbed(ctx.user, { draverColor: true })
                                .setTitle('Assigné')
                                .setDescription(`Vous vous êtes assigné à la tâche **${this.name}**`)
                        ],
                        ephemeral: true
                    }).catch(log4js.trace);
                }
                if (ctx.customId === ButtonIds.TaskClose) {
                    if (
                        !(ctx.member as GuildMember).permissions.has('ManageGuild') &&
                        this.data.opened_by !== ctx.user.id
                    ) {
                        ctx.reply({
                            embeds: [
                                replies.userMissingPermissions(ctx.user, {
                                    permissions: { missing: ['ManageGuild'] },
                                    guild: ctx.guild
                                })
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        return;
                    }

                    const confirmation = await confirm({
                        interaction: ctx,
                        user: ctx.user,
                        embed: basicEmbed(ctx.user)
                            .setTitle('Fermeture')
                            .setDescription(`Êtes-vous sûr de fermer cette tâche ?`),
                        ephemeral: true
                    }).catch(log4js.trace);
                    if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                        ctx.editReply({
                            embeds: [replies.cancel()],
                            components: []
                        }).catch(log4js.trace);
                        return;
                    }
                    this.close(true);

                    ctx.deleteReply().catch(log4js.trace);
                    const rep = this.close();

                    if (rep === 'already closed') {
                        ctx.reply({
                            embeds: [
                                basicEmbed(ctx.user, { evoker: this.guild })
                                    .setTitle('Tâche fermée')
                                    .setDescription(`La tâche est déjà fermée`)
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        this.edit();
                        return;
                    }
                    if (rep === 'cannot close') {
                        ctx.reply({
                            embeds: [
                                basicEmbed(ctx.user, { evoker: this.guild })
                                    .setTitle('Tâche terminée')
                                    .setDescription(`La tâche est terminée, vous ne pouvez pas la fermer`)
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        return;
                    }
                }
                if (ctx.customId === ButtonIds.TaskUnAssign) {
                    if (!this.isAssigned(ctx.user.id)) {
                        ctx.reply({
                            embeds: [
                                basicEmbed(ctx.user, { evoker: this.guild })
                                    .setTitle('Non assigné')
                                    .setDescription(`Vous n'êtes pas assigné à cette tâche`)
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        return;
                    }
                    this.removeAssignation(ctx.user.id);

                    ctx.reply({
                        embeds: [
                            basicEmbed(ctx.user, { draverColor: true })
                                .setTitle('Assignation retirée')
                                .setDescription(`Vous n'êtes plus assigné à cette tâche`)
                        ],
                        ephemeral: true
                    }).catch(log4js.trace);
                }
                if (ctx.customId === ButtonIds.TaskDone) {
                    if (
                        !(ctx.member as GuildMember).permissions.has('ManageGuild') &&
                        this.data.opened_by !== ctx.user.id
                    ) {
                        ctx.reply({
                            embeds: [
                                replies.userMissingPermissions(ctx.user, {
                                    permissions: { missing: ['ManageGuild'] },
                                    guild: ctx.guild
                                })
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        return;
                    }
                    const confirmation = await confirm({
                        interaction: ctx,
                        user: ctx.user,
                        embed: basicEmbed(ctx.user)
                            .setTitle('Terminer')
                            .setDescription(`Êtes-vous sûr de marquer cette tâche comme terminée ?`),
                        ephemeral: true
                    }).catch(log4js.trace);
                    if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                        ctx.editReply({
                            embeds: [replies.cancel()],
                            components: []
                        }).catch(log4js.trace);
                        return;
                    }
                    this.done();

                    ctx.deleteReply().catch(log4js.trace);
                    if (this.ended) {
                        ctx.reply({
                            embeds: [
                                basicEmbed(ctx.user, { evoker: this.guild })
                                    .setTitle('Tâche terminée')
                                    .setDescription(`Cette tâche a déjà été terminée`)
                            ],
                            ephemeral: true
                        }).catch(log4js.trace);
                        this.edit();
                        return;
                    }
                    this.done();
                    ctx.deferUpdate().catch(log4js.trace);
                }
            });

            if (notNull(this.deadline) && this.deadline > 0) {
                setTimeout(() => {
                    this.close(false);
                }, this.deadline - this.startedAt);
            }
        }
    }
}
