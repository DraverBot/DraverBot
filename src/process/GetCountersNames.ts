import {
    CommandInteraction,
    GuildMember,
    Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    User
} from 'discord.js';
import { Process } from '../structures/Process';
import { CounterId } from '../typings/database';
import { Counter } from '../structures/Counter';
import { basicEmbed, buildButton, capitalize, random, row } from '../utils/toolbox';
import { log4js } from 'amethystjs';
import replies from '../data/replies';
import { ButtonIds } from '../typings/buttons';
import { countersManager } from '../cache/managers';

export default new Process(
    'Get counter names',
    async ({
        interaction,
        user,
        counter,
        message
    }: {
        interaction: CommandInteraction;
        user: User;
        counter: Counter;
        message: Message<true>;
    }): Promise<'canceled' | { id: CounterId; name: string }[]> => {
        return new Promise(async (resolve) => {
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(user, { questionMark: true })
                            .setTitle('Noms')
                            .setDescription(
                                `Appuyez sur le bouton pour définir les noms des compteurs.\n\n💡\n> Pour faire apparaitre le compte associé au compteur, écrivez \`{cmp}\` à l'endroit où vous voulez le faire apparaitre.\n> Par exemple, \`Membres : {cmp}\` affichera ${((count: number) => `\`Membres : ${count.toLocaleString()}\` si il y a **${count.toLocaleString()}** membres`)(random({ max: 2590, min: 1001 }))}`
                            )
                    ],
                    components: [
                        row(
                            buildButton({
                                label: 'Définir les noms',
                                buttonId: 'EditCounterNamesButton',
                                style: 'Secondary'
                            })
                        )
                    ]
                })
                .catch(log4js.trace);
            const collector = message.createMessageComponentCollector({
                time: 300000
            });

            collector.on('collect', async (ctx) => {
                if (ctx.user.id !== user.id)
                    return (
                        void 0 &&
                        ctx
                            .reply({
                                embeds: [replies.replyNotAllowed(ctx.member as GuildMember)],
                                ephemeral: true
                            })
                            .catch(log4js.trace)
                    );

                const enabled = counter.channels.filter((x) => x.enabled);
                if (!enabled.length) {
                    await ctx.deferUpdate().catch(log4js.trace);
                    collector.stop('no counter');
                    return;
                }
                const modal = new ModalBuilder()
                    .setTitle('Noms')
                    .setCustomId(ButtonIds.EditCounterNamesModal)
                    .setComponents(
                        enabled.map((x) => {
                            const info = countersManager.data.find((y) => y.id === x.id);

                            return row(
                                new TextInputBuilder()
                                    .setCustomId(x.id.toString())
                                    .setLabel(capitalize(info.name))
                                    .setValue(x.name)
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                                    .setMaxLength(50)
                            );
                        })
                    );

                await ctx.showModal(modal).catch(log4js.trace);
                const modalReply = await ctx
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(log4js.trace);
                if (!modalReply) return;

                modalReply.deferUpdate().catch(log4js.trace);
                collector.stop('success');

                await interaction
                    .editReply({
                        embeds: [replies.wait(user)],
                        components: []
                    })
                    .catch(log4js.trace);
                return resolve(
                    enabled.map((x) => ({
                        name: modalReply.fields.getTextInputValue(x.id.toString()),
                        id: x.id
                    }))
                );
            });

            collector.on('end', async (_c, reason) => {
                if (reason === 'no counter') {
                    interaction
                        .editReply({
                            embeds: [replies.noCounter(interaction.member as GuildMember)],
                            components: []
                        })
                        .catch(log4js.trace);
                    return resolve('canceled');
                }
                if (reason === 'success') return;

                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
                return resolve('canceled');
            });
        });
    }
);
