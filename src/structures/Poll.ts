import {
    Client,
    ComponentType,
    EmbedBuilder,
    Guild,
    GuildMember,
    InteractionCollector,
    Message,
    StringSelectMenuInteraction,
    TextChannel
} from 'discord.js';
import { DatabaseTables, polls } from '../typings/database';
import { log4js } from 'amethystjs';
import query from '../utils/query';
import { basicEmbed, confirm, numerize, pingUser, plurial, round } from '../utils/toolbox';
import replies from '../data/replies';

export class Poll {
    private _data: polls;
    private _client: Client;
    private _message: Message<true>;
    private _channel: TextChannel;
    private _guild: Guild;
    private _initiated = false;
    private _collector: InteractionCollector<StringSelectMenuInteraction<'cached'>>;
    private _ended = false;

    constructor(client: Client, data: polls) {
        this._data = data;
        this._client = client;
        this.init();
    }
    public get ended() {
        return this._ended;
    }
    public get collector() {
        return this._collector;
    }
    public get initiated() {
        return this._initiated;
    }
    public get guild() {
        return this._guild;
    }
    public get channel() {
        return this._channel;
    }
    public get message() {
        return this._message;
    }
    public get client() {
        return this._client;
    }
    public get data() {
        return this._data;
    }

    public async registerParticipationFor(user_id: string, votes: number[]) {
        const choices = this._data.choices.filter((x) => votes.includes(x.id));
        if (!choices) return 'no vote with the specified id';
        if (this._data.participants.includes(user_id)) return 'user already participates';

        this._data.participants.push(user_id);

        votes.forEach((vote) => {
            const index = this._data.choices.indexOf(this._data.choices.find((x) => x.id == vote));
            this._data.choices[index].count++;
        });

        await query(
            `UPDATE ${DatabaseTables.Polls} SET participants='${JSON.stringify(
                this._data.participants
            )}', choices="${JSON.stringify(this._data.choices).replace(/"/g, '\\"')}" WHERE poll_id='${
                this._data.poll_id
            }'`
        );

        return true;
    }
    public end() {
        if (this._ended) return 'already ended';
        this._ended = true;

        if (this._collector) this._collector.stop();

        const base = this.message.embeds[0];
        const embed = new EmbedBuilder(base);

        embed.setFields({
            name: 'Terminé',
            value: 'Sondage terminé',
            inline: false
        });

        const totalVotes = this.data.choices.map((x) => x.count).reduce((a, b) => a + b);
        const result = new EmbedBuilder()
            .setTitle('Résultats')
            .setFooter(base.footer)
            .setColor(base.color)
            .setTimestamp()
            .setDescription(
                `Le sondage est terminé.\n> Total de votes : \`${totalVotes}\`${
                    totalVotes === 0
                        ? `\nLa question n'a pas pu être tranchée`
                        : `\n\n${this.data.choices
                              .sort((a, b) => b.count - a.count)
                              .map(
                                  (x) =>
                                      `\`${x.name}\` : ${numerize(x.count)} vote${plurial(x.count)} (${round(
                                          (x.count * 100) / totalVotes,
                                          1
                                      )}%)`
                              )
                              .join('\n')}`
                }`
            );

        this._message.edit({ embeds: [embed], components: [] }).catch(log4js.trace);
        this._channel.send({ reply: { messageReference: this._message }, embeds: [result] }).catch(log4js.trace);

        query(`UPDATE ${DatabaseTables.Polls} SET ended='1' WHERE poll_id='${this.data.poll_id}'`);
    }
    public isUserParticipating(userId: string) {
        return this._data.participants.includes(userId);
    }
    private async editMessage() {
        const base = this._message.embeds[0];
        const embed = new EmbedBuilder(base);
        embed.setDescription(
            `Sondage lancé par ${pingUser(this._data.started_by)}\n> ${this._data.question}\n\n${this._data.choices
                .map((x) => `- ${x.name} ( ${x.count} vote${plurial(x.count)} )`)
                .join('\n')}`
        );

        return this._message.edit({ embeds: [embed] }).catch(log4js.trace);
    }

    private async init() {
        await this._client.guilds.fetch();
        const guild = this._client.guilds.cache.get(this._data.guild_id);

        if (!guild) return log4js.trace(`No guild found to init poll ${this._data.poll_id}`);
        this._guild = guild;

        const channel = (await this._guild.channels.fetch(this._data.channel_id).catch(log4js.trace)) as TextChannel;
        if (!channel) return log4js.trace(`No channel found to init poll ${this._data.poll_id}`);
        this._channel = channel;

        await this._channel.messages.fetch();
        const message = this._channel.messages.cache.get(this._data.message_id);
        if (!message) return log4js.trace(`No message found to init poll ${this._data.poll_id}`);

        this._message = message;

        if (this._data.endsAt <= Date.now()) return this.end();
        const collector = this._message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect
        });

        collector.on('collect', async (ctx) => {
            if (this.isUserParticipating(ctx.user.id)) {
                ctx.reply({
                    embeds: [
                        basicEmbed(ctx.user, { evoker: ctx.guild })
                            .setTitle('Participation déjà enregistrée')
                            .setDescription(`Vous avez déjà voté pour ce sondage`)
                    ],
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }
            const choices = ctx.values.map((x) => this._data.choices.find((y) => y.id === parseInt(x)));
            if (!choices) {
                ctx.reply({
                    embeds: [replies.internalError((ctx.member as GuildMember) ?? ctx.user)],
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }
            const displayChoice = () =>
                choices.length === 1 ? `\`${choices[0].name}\`` : choices.map((x) => `\`${x.name}\``).join(', ');

            const confirmation = await confirm({
                interaction: ctx,
                user: ctx.user,
                time: 120000,
                ephemeral: true,
                embed: basicEmbed(ctx.user)
                    .setTitle('Participation')
                    .setDescription(
                        `Êtes vous sûr de voter pour ${displayChoice()} ? Vous ne pourrez plus changer votre vote.`
                    )
            }).catch(log4js.trace);

            if (!confirmation || confirmation === 'cancel' || !confirmation.value) {
                ctx.editReply({ components: [], embeds: [replies.cancel(ctx)] }).catch(log4js.trace);
                return;
            }

            await Promise.all([
                this.registerParticipationFor(
                    ctx.user.id,
                    choices.map((x) => x.id)
                ),
                ctx.editReply({ embeds: [replies.wait(ctx.user, ctx)], components: [] }).catch(log4js.trace),
                this.editMessage()
            ]);

            ctx.editReply({
                embeds: [
                    basicEmbed(ctx.user, { draverColor: true })
                        .setTitle('Participation enregistrée')
                        .setDescription(`Vous avez voté pour ${displayChoice()}`)
                ]
            }).catch(log4js.trace);
        });

        this._collector = collector;

        setTimeout(() => {
            this.end();
        }, this._data.endsAt - Date.now());
        this._initiated = true;
    }
}
