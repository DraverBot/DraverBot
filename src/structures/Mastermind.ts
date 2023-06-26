import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    CommandInteraction,
    ComponentType,
    InteractionCollector,
    Message,
    User
} from 'discord.js';
import { colorId, colorType, pinId, pinType } from '../typings/mastermind';
import { basicEmbed, buildButton, capitalize, confirm, random, row, systemReply } from '../utils/toolbox';
import { color } from '../utils/functions';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { ButtonIds } from '../typings/buttons';

export class Mastermind {
    private rows: number;
    private colors: number;
    private user: User;
    private interaction: CommandInteraction;
    private tries: { input: colorId[]; res: pinId[] }[] = [];
    private maxTries: number;
    private collector: InteractionCollector<ButtonInteraction>;
    private message: Message;
    private ended = false;
    private combination: colorId[] = [];

    constructor({
        rows,
        colors,
        user,
        interaction,
        maxTries
    }: {
        rows: 4 | 5;
        colors: 6 | 8;
        user: User;
        interaction: CommandInteraction;
        maxTries: number;
    }) {
        this.rows = rows;
        this.colors = colors;
        this.user = user;
        this.interaction = interaction;
        this.maxTries = maxTries;

        this.start();
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
        ].splice(0, this.colors) as colorType[];
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
        const embed = basicEmbed(this.user)
            .setColor(color('mastermind'))
            .setTitle('Mastermind')
            .setFields({
                name: 'Indications',
                value: `>>> Les petits carrés blancs indiquent une bonne couleur au mauvais endroit.\nLes petits carrés noirs indiquent une bonne couleur placée au bon endroit.`,
                inline: false
            })
            .setDescription(
                `**Tentatives restantes :** \`${this.maxTries - this.tries.length}\`\n\n${this.triesDisplay}`
            );

        return embed;
    }
    private get components(): ActionRowBuilder<ButtonBuilder>[] {
        return [
            row(
                buildButton({ label: 'Tentative', style: 'Primary', buttonId: 'MastermindReply' }),
                buildButton({ label: 'Abandonner', style: 'Danger', buttonId: 'MastermindResign' })
            )
        ];
    }
    private disableButtons() {
        this.message
            .edit({ components: [row(...this.components[0].components.map((x) => x.setDisabled(true)))] })
            .catch(log4js.trace);
    }
    private enableButtons() {
        this.edit();
    }
    private edit() {
        return systemReply(this.interaction, { embeds: [this.embed], components: this.components, fetchReply: true });
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
        this.interaction
            .editReply({
                embeds: [
                    basicEmbed(this.user)
                        .setColor(color('mastermindResign'))
                        .setTitle('Défaite')
                        .setDescription(
                            `Vous avez perdu, vous avez fait vos ${this.maxTries} tentatives\n\n${this.triesDisplay}`
                        )
                        .setFields({
                            name: 'Combinaison',
                            value: `La combinaison était ${this.combination
                                .map((x) => this.palette.find((y) => y.id === x).emoji)
                                .join(' ')}`,
                            inline: false
                        })
                ],
                components: []
            })
            .catch(log4js.trace);
        this.collector.stop('defeat');
    }
    private win() {
        this.interaction
            .editReply({
                embeds: [
                    basicEmbed(this.user)
                        .setColor(color('mastermindWin'))
                        .setTitle('Victoire')
                        .setDescription(
                            `Vous avez trouvé la bonne combinaison en ${this.tries.length} tentatives !\n\n${this.triesDisplay}`
                        )
                ],
                components: []
            })
            .catch(log4js.trace);
        this.collector.stop('win');
    }
    private async handleAnswer(interaction: ButtonInteraction) {
        this.disableButtons();
        const choice: colorId[] = [];

        const choiceEmbed = () => {
            return basicEmbed(this.user, { questionMark: true })
                .setTitle(`Choix`)
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
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;
        if (!rep) return this.enableButtons();

        const choiceCollector = rep.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000
        });
        choiceCollector.on('collect', async (ctx) => {
            if (ctx.user.id !== this.user.id) {
                ctx.reply({
                    ephemeral: true,
                    embeds: [
                        basicEmbed(ctx.user)
                            .setTitle('Interaction refusée')
                            .setDescription(`Vous ne pouvez pas interagir avec ce message`)
                    ]
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
        const replied = this.interaction.replied || this.interaction.deferred;
        this.generateCombination();

        if (replied) {
            this.edit().catch(log4js.trace);
            this.message = (await this.interaction.fetchReply().catch(log4js.trace)) as Message<true>;
        } else {
            this.message = (await this.interaction
                .reply({ embeds: [this.embed], components: this.components, fetchReply: true })
                .catch(log4js.trace)) as Message<true>;
        }
        if (!this.message)
            return this.interaction
                .editReply({ embeds: [replies.internalError(this.user)], components: [] })
                .catch(log4js.trace);

        this.collector = this.message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 600000
        });

        this.collector.on('collect', async (ctx) => {
            if (ctx.user.id !== this.user.id) {
                ctx.reply({
                    ephemeral: true,
                    embeds: [
                        basicEmbed(ctx.user)
                            .setTitle('Interaction refusée')
                            .setDescription(`Vous ne pouvez pas interagir avec ce message`)
                    ]
                }).catch(log4js.trace);
                return;
            }

            if (ctx.customId === ButtonIds.MastermindResign) {
                const confirmation = await confirm({
                    interaction: ctx,
                    embed: basicEmbed(this.user)
                        .setTitle('Abandon')
                        .setDescription(`Êtes-vous sûr de vouloir abandonner ?`),
                    user: this.user,
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
                this.message
                    .edit({
                        embeds: [
                            basicEmbed(this.user)
                                .setColor(color('mastermindResign'))
                                .setTitle('Abandon')
                                .setDescription(`Vous avez abandonné`)
                                .setFields({
                                    name: 'Combinaison',
                                    value: `La combinaison était ${this.combination
                                        .map((x) => this.palette.find((y) => y.id === x).emoji)
                                        .join(' ')}`,
                                    inline: false
                                })
                        ],
                        components: []
                    })
                    .catch(log4js.trace);
            }
            if (reason === 'defeat') {
            }
            if (reason === 'win') {
            }
        });
    }
}
