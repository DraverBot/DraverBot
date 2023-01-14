import {
    ButtonInteraction,
    ComponentType,
    InteractionCollector,
    Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { closePaginator, firstPage, lastPage, nextPage, previousPage, selectButton } from '../data/buttons';
import replies from '../data/replies';
import { paginatorOptions } from '../typings/functions';
import { util } from '../utils/functions';
import { row, sendError, systemReply } from '../utils/toolbox';

export class Paginator {
    public readonly options: paginatorOptions;
    private _index = 0;
    private collector: InteractionCollector<ButtonInteraction>;

    constructor(options: paginatorOptions) {
        this.options = options;
        this.options.time = options?.time ?? 120000;

        this.start();
    }

    public stop() {
        this.collector.stop();
    }
    private endMessage() {
        this.options.interaction
            .editReply({
                embeds: [replies.cancel()],
                components: []
            })
            .catch(sendError);
    }

    private async start() {
        const reply = (await systemReply(this.options.interaction, {
            components: this.components,
            embeds: [this.pickEmbed()],
            fetchReply: true
        }).catch(sendError)) as Message<true>;

        if (!reply) return;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== this.options.user.id) {
                interaction
                    .reply({
                        ephemeral: true,
                        embeds: [replies.replyNotAllowed(interaction.member ?? interaction.user)]
                    })
                    .catch(sendError);
                return;
            }

            if (interaction.customId === util('paginatorClose')) {
                this.stop();
                return;
            }

            if (interaction.customId === util('paginatorSelect')) {
                const modal = new ModalBuilder({
                    components: [
                        row<TextInputBuilder>(
                            new TextInputBuilder({
                                customId: 'paginatorSelectField',
                                placeholder: '1',
                                style: TextInputStyle.Short,
                                maxLength: this.options.embeds.length.toString().length,
                                required: true,
                                label: 'Numéro de page'
                            })
                        )
                    ],
                    customId: 'paginatorSelectModal',
                    title: 'Changer de page'
                });

                interaction.showModal(modal);
                const reply = await interaction
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(sendError);

                if (!reply) return;
                const pageIndex = parseInt(reply.fields.getTextInputValue('paginatorSelectField'));
                if (!pageIndex || isNaN(pageIndex) || pageIndex < 1 || pageIndex > this.options.embeds.length) {
                    reply
                        .reply({
                            content: `Merci de sélectionner un nombre valide, compris entre **1** et **${this.options.embeds.length}**`,
                            ephemeral: true
                        })
                        .catch(sendError);
                    return;
                }

                reply.deferUpdate();

                this._index = pageIndex - 1;
            }

            switch (interaction.customId) {
                case util('paginatorNext'):
                    this._index++;
                    break;
                case util('paginatorFirst'):
                    this._index = 0;
                    break;
                case util('paginatorPrevious'):
                    this._index--;
                    break;
                case util('paginatorLast'):
                    this._index = this.options.embeds.length - 1;
                    break;
            }

            interaction.deferUpdate().catch(sendError);
            this.updateMessage();
        });

        collector.on('end', () => {
            this.endMessage();
        });

        this.collector = collector;
    }

    private updateMessage() {
        this.options.interaction.editReply({
            embeds: [this.pickEmbed()],
            components: this.components
        });
    }

    private pickEmbed() {
        return this.options.embeds[this.index];
    }

    public get index() {
        return this._index;
    }

    private get components() {
        const components = [
            row(
                firstPage(this.index === 0),
                previousPage(this.index < 1),
                selectButton(),
                nextPage(!(this.index < this.options.embeds.length - 1)),
                lastPage(this.index === this.options.embeds.length - 1)
            ),
            row(closePaginator())
        ];

        return components;
    }
}
