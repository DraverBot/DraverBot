import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    CommandInteraction,
    ComponentType,
    GuildMember,
    InteractionCollector,
    Message,
    User
} from 'discord.js';
import { callbackType, colorId, colorType, pinId, pinType } from '../typings/mastermind';
import { basicEmbed, buildButton, capitalize, confirm, random, row, systemReply } from '../utils/toolbox';
import { color } from '../utils/functions';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { ButtonIds } from '../typings/buttons';
import SetRandomComponent from '../process/SetRandomComponent';
import { translator } from '../translate/translate';

export class Mastermind {
    private rows: number;
    private colors: number;
    private _user: User;
    private _interaction: CommandInteraction | ButtonInteraction;
    private tries: { input: colorId[]; res: pinId[] }[] = [];
    private maxTries: number;
    private collector: InteractionCollector<ButtonInteraction>;
    private _message: Message;
    private _ended = false;
    private combination: colorId[] = [];
    private ephemeral: boolean;
    private onEndMethod: callbackType = () => {};

    public get user() {
        return this._user;
    }
    public get interaction() {
        return this._interaction;
    }
    public get message() {
        return this._message;
    }
    public get ended() {
        return this._ended;
    }

    constructor({
        rows,
        colors,
        user,
        interaction,
        maxTries,
        ephemeral = false
    }: {
        rows: 4 | 5;
        colors: 6 | 8;
        user: User;
        interaction: CommandInteraction | ButtonInteraction;
        maxTries: number;
        ephemeral?: boolean;
    }) {
        this.rows = rows;
        this.colors = colors;
        this._user = user;
        this._interaction = interaction;
        this.maxTries = maxTries;
        this.ephemeral = ephemeral;

        this.start();
    }

    public onEnd(callback: callbackType) {
        this.onEndMethod = callback;
    }
    public get pinGood() {
        return this.pins.find((x) => x.id === 'good').emoji;
    }
    public get pinCorrect() {
        return this.pins.find((x) => x.id === 'correct').emoji;
    }
    public get emptySquare() {
        return '⬛';
    }
    public get pins(): pinType[] {
        return [
            { id: 'correct', emoji: '▪️' },
            { id: 'good', emoji: '▫️' }
        ];
    }
    public get palette(): colorType[] {
        return [
            { emoji: '🔴', name: 'rouge', id: 'red' },
            { emoji: '🟡', name: 'jaune', id: 'yellow' },
            { emoji: '🔵', name: 'bleu', id: 'blue' },
            { emoji: '🟢', name: 'vert', id: 'green' },
            { emoji: '⚫', name: 'noir', id: 'black' },
            { emoji: '⚪', name: 'blanc', id: 'white' },
            { emoji: '🟤', name: 'marron', id: 'brown' },
            { emoji: '🟠', name: 'orange', id: 'orange' }
        ]
            .splice(0, this.colors)
            .map((x) => ({
                ...x,
                name: translator.translate(`contents.games.mastermind.colors.${x.id}`, this._interaction)
            })) as colorType[];
    }

    private join(array: string[]) {
        return array.join(' ');
    }
    private array(item: string, length = this.rows) {
        return new Array(length).fill(item);
    }
    private displayTry({ input, res }: { input: colorId[]; res: pinId[] }) {
        return (
            this.join(input.map((x) => this.palette.find((y) => y.id === x).emoji)) +
            (res.length > 0 ? ` ${this.join(res.map((y) => this.pins.find((x) => x.id === y).emoji))}` : '')
        );
    }
    private get triesDisplay() {
        let content = '';
        const formatNumber = (int: number) => {
            if (int <= 9) return `${int}.  `;
            return `${int}. `;
        };
        for (let i = 0; i < this.maxTries; i++) {
            if (!this.tries[i]) {
                content += `\n${formatNumber(i + 1)}${this.join(this.array(this.emptySquare))}`;
            } else {
                content += `\n${formatNumber(i + 1)}` + this.displayTry(this.tries[i]);
            }
        }

        return content;
    }
    private get embed() {
        const embed = basicEmbed(this._user)
            .setColor(color('mastermind'))
            .setTitle(translator.translate('contents.games.mastermind.embed.title', this._interaction))
            .setFields({
                name: translator.translate('contents.games.mastermind.embed.field.name', this._interaction),
                value: translator.translate('contents.games.mastermind.embed.field.value', this._interaction),
                inline: false
            })
            .setDescription(
                translator.translate('contents.games.mastermind.embed.description', this._interaction, {
                    count: this.maxTries - this.tries.length,
                    display: this.triesDisplay
                })
            );

        return embed;
    }
    private get components(): ActionRowBuilder<ButtonBuilder>[] {
        return [
            row(
                buildButton({
                    label: translator.translate('contents.games.mastermind.buttons.try', this._interaction),
                    style: 'Primary',
                    buttonId: 'MastermindReply'
                }),
                buildButton({
                    label: translator.translate('contents.games.mastermind.buttons.resign', this._interaction),
                    style: 'Danger',
                    buttonId: 'MastermindResign'
                })
            )
        ];
    }
    private disableButtons() {
        this._interaction
            .editReply({ components: [row(...this.components[0].components.map((x) => x.setDisabled(true)))] })
            .catch(log4js.trace);
    }
    private enableButtons() {
        this.edit();
    }
    private edit() {
        return systemReply(this._interaction, { embeds: [this.embed], components: this.components, fetchReply: true });
    }
    private try(choice: colorId[]) {
        const check = () => {
            let good = this.combination.filter((x) => choice.includes(x)).length;
            let correct = 0;

            choice.forEach((c, i) => {
                if (c === this.combination[i]) {
                    good--;
                    correct++;
                }
            });

            return { good, correct };
        };
        const res = check();
        const generateArray = ({ good, correct }: { good: number; correct: number }) => {
            return this.array(this.pinCorrect, correct).concat(this.array(this.pinGood, good));
        };
        this.tries.push({
            input: choice,
            res: generateArray(res).map((x) => (x === this.pinCorrect ? 'correct' : x === this.pinGood ? 'good' : null))
        });

        if (res.correct === this.rows) {
            this.win();
        } else {
            this.edit();
            if (this.tries.length === this.maxTries) this.loose();
        }
    }
    private loose() {
        this.onEndMethod('loose', this.tries, this.combination);
        this._interaction
            .editReply({
                embeds: [
                    basicEmbed(this._user)
                        .setColor(color('mastermindResign'))
                        .setTitle(translator.translate('contents.games.mastermind.lost.title', this._interaction))
                        .setDescription(
                            translator.translate('contents.games.mastermind.lost.description', this._interaction, {
                                tries: this.maxTries,
                                display: this.triesDisplay
                            })
                        )
                        .setFields({
                            name: translator.translate('contents.games.mastermind.lost.field.name', this._interaction),
                            value: translator.translate(
                                'contents.games.mastermind.lost.field.value',
                                this._interaction,
                                {
                                    combination: this.combination
                                        .map((x) => this.palette.find((y) => y.id === x).emoji)
                                        .join(' ')
                                }
                            ),
                            inline: false
                        })
                ],
                components: []
            })
            .catch(log4js.trace);
        this.collector.stop('defeat');
    }
    private win() {
        this.onEndMethod('win', this.tries, this.combination);
        this._interaction
            .editReply({
                embeds: [
                    basicEmbed(this._user)
                        .setColor(color('mastermindWin'))
                        .setTitle(translator.translate('contents.games.mastermind.win.title', this._interaction))
                        .setDescription(
                            translator.translate('contents.games.mastermind.win.description', this._interaction, {
                                tries: this.tries.length,
                                display: this.triesDisplay
                            })
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
        this.collector.stop('win');
    }
    public resign() {
        this.collector.stop('resign');
    }
    private async handleAnswer(interaction: ButtonInteraction) {
        this.disableButtons();
        const choice: colorId[] = [];

        const choiceEmbed = () => {
            return basicEmbed(this._user, { questionMark: true })
                .setTitle(translator.translate('contents.games.mastermind.chooseTitle', interaction))
                .setDescription(
                    `${this.join(choice.map((x) => this.palette.find((y) => y.id === x).emoji))} ${this.join(
                        new Array(this.rows - choice.length).fill(this.emptySquare)
                    )}`
                );
        };
        const choiceComponents = (): ActionRowBuilder<ButtonBuilder>[] => {
            const buttons = this.palette.map((x) =>
                buildButton({
                    label: capitalize(x.name),
                    style: 'Secondary',
                    emoji: x.emoji,
                    id: x.id,
                    disabled: choice.includes(x.id)
                })
            );

            const rows = [row()];
            buttons.forEach((btn, i) => {
                if (i % 5 === 0 && i > 0) rows.push(row());
                rows[rows.length - 1].addComponents(btn);
            });

            return rows;
        };
        const rep = (await interaction
            .reply({
                embeds: [choiceEmbed()],
                components: choiceComponents(),
                fetchReply: true,
                ephemeral: this.ephemeral
            })
            .catch(log4js.trace)) as Message<true>;
        if (!rep) return this.enableButtons();

        const choiceCollector = rep.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });
        choiceCollector.on('collect', async (ctx) => {
            if (ctx.user.id !== this._user.id) {
                ctx.reply({
                    ephemeral: true,
                    embeds: [replies.replyNotAllowed((this._interaction?.member as GuildMember) ?? this._user, ctx)],
                    components: SetRandomComponent.process()
                }).catch(log4js.trace);
                return;
            }
            const id = ctx.customId as colorId;
            choice.push(id);

            if (choice.length === this.rows) {
                choiceCollector.stop('try');
                interaction.deleteReply().catch(log4js.trace);
            } else {
                ctx.deferUpdate().catch(log4js.trace);
                interaction
                    .editReply({
                        embeds: [choiceEmbed()],
                        components: choiceComponents()
                    })
                    .catch(log4js.trace);
            }
        });
        choiceCollector.on('end', (_c, reason) => {
            if (reason === 'try') {
                this.try(choice);
            } else {
                interaction.deleteReply().catch(log4js.trace);
                this.enableButtons();
            }
        });
    }
    private generateCombination() {
        for (let i = 0; i < this.rows; i++) {
            const valid = this.palette.filter((x) => !this.combination.includes(x.id));
            this.combination.push(valid[random({ max: valid.length })].id);
        }
    }
    private async start() {
        const replied = this._interaction.replied || this._interaction.deferred;
        this.generateCombination();

        if (replied) {
            this.edit().catch(log4js.trace);
            this._message = (await this._interaction.fetchReply().catch(log4js.trace)) as Message<true>;
        } else {
            this._message = (await this._interaction
                .reply({
                    embeds: [this.embed],
                    components: this.components,
                    fetchReply: true,
                    ephemeral: this.ephemeral
                })
                .catch(log4js.trace)) as Message<true>;
        }
        if (!this._message)
            return this._interaction
                .editReply({ embeds: [replies.internalError(this._user, this._interaction)], components: [] })
                .catch(log4js.trace);

        this.collector = this._message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });

        this.collector.on('collect', async (ctx) => {
            if (ctx.user.id !== this._user.id) {
                ctx.reply({
                    ephemeral: true,
                    embeds: [replies.replyNotAllowed((this._interaction?.member as GuildMember) ?? this._user, ctx)],
                    components: SetRandomComponent.process()
                }).catch(log4js.trace);
                return;
            }

            if (ctx.customId === ButtonIds.MastermindResign) {
                const confirmation = await confirm({
                    interaction: ctx,
                    embed: basicEmbed(this._user)
                        .setTitle(translator.translate('contents.games.mastermind.resigning.title', ctx))
                        .setDescription(translator.translate('contents.games.mastermind.resigning.description', ctx)),
                    user: this._user,
                    ephemeral: true
                }).catch(log4js.trace);

                if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
                    return ctx.deleteReply().catch(log4js.trace);
                ctx.deleteReply().catch(log4js.trace);
                this.collector.stop('resign');
            }
            if (ctx.customId === ButtonIds.MastermindReply) {
                this.handleAnswer(ctx);
            }
        });
        this.collector.on('end', (_c, reason) => {
            if (reason === 'resign') {
                this._interaction
                    .editReply({
                        embeds: [
                            basicEmbed(this._user)
                                .setColor(color('mastermindResign'))
                                .setTitle(
                                    translator.translate('contents.games.mastermind.resigned.title', this._interaction)
                                )
                                .setDescription(
                                    translator.translate(
                                        'contents.games.mastermind.resigned.description',
                                        this._interaction
                                    )
                                )
                                .setFields({
                                    name: translator.translate(
                                        'contents.games.mastermind.resigned.field.name',
                                        this._interaction
                                    ),
                                    value: translator.translate(
                                        'contents.games.mastermind.resigned.field.value',
                                        this._interaction,
                                        {
                                            display: this.combination
                                                .map((x) => this.palette.find((y) => y.id === x).emoji)
                                                .join(' ')
                                        }
                                    ),
                                    inline: false
                                })
                        ],
                        components: []
                    })
                    .catch(log4js.trace);
                this.onEndMethod('loose', this.tries, this.combination);
                return;
            }
            if (reason === 'defeat') {
                return;
            }
            if (reason === 'win') {
                return;
            }

            this.loose();
        });
    }
}
