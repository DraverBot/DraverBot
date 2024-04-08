import {
    ChannelSelectMenuBuilder,
    ChannelType,
    CommandInteraction,
    Message,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    User
} from 'discord.js';
import { Process } from '../structures/Process';
import replies from '../data/replies';
import { log4js } from 'amethystjs';
import { basicEmbed, buildButton, capitalize, pingChan, plurial, random, row, systemReply } from '../utils/toolbox';
import { ButtonIds } from '../typings/buttons';
import { CounterId } from '../typings/database';
import { countersManager } from '../cache/managers';

export default new Process(
    'get counters config',
    async ({
        user,
        interaction
    }: {
        user: User;
        interaction: CommandInteraction;
    }): Promise<
        | 'canceled'
        | {
              category?: string;
              selected: CounterId[];
              names: string[];
              type: ChannelType.GuildText | ChannelType.GuildVoice;
          }
    > => {
        return new Promise(async (resolve) => {
            const rep = (await interaction
                .reply({
                    embeds: [replies.wait(user)],
                    fetchReply: true
                })
                .catch(log4js.trace)) as Message<true>;

            if (!rep) {
                systemReply(interaction, {
                    embeds: [replies.cancel()]
                }).catch(log4js.trace);
                return resolve('canceled');
            }
            const collector = rep.createMessageComponentCollector({
                time: 600000
            });
            const end = Date.now() + 600000;

            let state = 'askCategory' as 'askCategory' | 'categorySelection' | 'selectCounters' | 'naming' | 'type';

            interaction
                .editReply({
                    embeds: [
                        basicEmbed(user, { questionMark: true })
                            .setTitle('Catégorie')
                            .setDescription(
                                `Voulez-vous utiliser une catégorie déjà existante, ou bien en créer une nouvelle automatiquement ?`
                            )
                            .setTimestamp(end)
                    ],
                    components: [
                        row(
                            buildButton({
                                label: 'Catégorie existante',
                                buttonId: 'SelectCategory',
                                style: 'Primary'
                            }),
                            buildButton({
                                label: 'Création automatique',
                                buttonId: 'AutoCategory',
                                style: 'Secondary'
                            })
                        )
                    ]
                })
                .catch(log4js.trace);

            const cache = {
                category: null,
                selected: [],
                names: []
            } as {
                category?: string;
                selected: CounterId[];
                names: string[];
                type: ChannelType.GuildText | ChannelType.GuildVoice;
            };
            collector.on('collect', async (ctx) => {
                if (ctx.user.id !== user.id) {
                    ctx.reply({
                        embeds: [replies.replyNotAllowed(ctx.user)],

                        ephemeral: true
                    }).catch(log4js.trace);
                    return;
                }

                if (ctx.isButton()) {
                    if (state === 'askCategory') {
                        if (ctx.customId === ButtonIds.SelectCategory) {
                            interaction
                                .editReply({
                                    embeds: [
                                        basicEmbed(user, { questionMark: true })
                                            .setTimestamp(end)
                                            .setDescription(
                                                `Veuillez sélectionner la catégorie dans laquelle vous voulez configurer les compteurs`
                                            )
                                            .setTitle('Catégorie')
                                    ],
                                    components: [
                                        row(
                                            new ChannelSelectMenuBuilder()
                                                .addChannelTypes(ChannelType.GuildCategory)
                                                .setCustomId(ButtonIds.CategorySelection)
                                                .setMaxValues(1)
                                        )
                                    ]
                                })
                                .catch(log4js.trace);

                            ctx.deferUpdate().catch(log4js.trace);
                            state = 'categorySelection';
                            return;
                        }
                        if (ctx.customId === ButtonIds.AutoCategory) {
                            interaction
                                .editReply({
                                    embeds: [
                                        basicEmbed(user, { questionMark: true })
                                            .setTimestamp(end)
                                            .setTitle('Compteurs')
                                            .setDescription(`Choisissez les compteurs que vous voulez activer`)
                                    ],
                                    components: [
                                        row(
                                            new StringSelectMenuBuilder()
                                                .setCustomId(ButtonIds.SelectCounters)
                                                .setMaxValues(countersManager.data.length)
                                                .setMinValues(1)
                                                .setOptions(
                                                    countersManager.data.map((x) => ({
                                                        label: x.name,
                                                        description: x.description,
                                                        value: x.id.toString()
                                                    }))
                                                )
                                        )
                                    ]
                                })
                                .catch(log4js.trace);
                            state = 'selectCounters';
                            ctx.deferUpdate().catch(log4js.trace);
                            return;
                        }
                    }
                    if (state === 'naming') {
                        const modal = new ModalBuilder()
                            .setTitle('Noms')
                            .setCustomId(ButtonIds.NameCountersModal)
                            .setComponents(
                                cache.selected.map((x) => {
                                    const data = countersManager.data.find((y) => y.id === x);
                                    return row(
                                        new TextInputBuilder()
                                            .setLabel(capitalize(data.name))
                                            .setMaxLength(50)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                            .setCustomId(x.toString())
                                            .setValue(`${capitalize(data.name)} : {cmp}`)
                                    );
                                })
                            );

                        await ctx.showModal(modal).catch(log4js.trace);

                        const reply = await ctx
                            .awaitModalSubmit({
                                time: 120000
                            })
                            .catch(log4js.trace);
                        if (!reply) return;

                        cache.names = cache.selected.map((x) => reply.fields.getTextInputValue(x.toString()));
                        reply.deferUpdate().catch(log4js.trace);

                        interaction
                            .editReply({
                                embeds: [
                                    basicEmbed(user, { questionMark: true })
                                        .setTimestamp(end)
                                        .setTitle('Type')
                                        .setDescription(`Quel doit être le type des compteurs ?`)
                                ],
                                components: [
                                    row(
                                        buildButton({
                                            label: 'Salons textuels',
                                            style: 'Secondary',
                                            buttonId: 'CountersText'
                                        }),
                                        buildButton({
                                            label: 'Salons vocaux',
                                            style: 'Secondary',
                                            buttonId: 'CountersVoice'
                                        })
                                    )
                                ]
                            })
                            .catch(log4js.trace);
                        state = 'type';
                        return;
                    }
                    if (state === 'type') {
                        cache.type =
                            ctx.customId === ButtonIds.CountersText ? ChannelType.GuildText : ChannelType.GuildVoice;

                        ctx.deferUpdate().catch(log4js.trace);

                        interaction
                            .editReply({
                                embeds: [replies.wait(user)],
                                components: []
                            })
                            .catch(log4js.trace);

                        collector.stop('ended');
                    }
                }
                if (ctx.isChannelSelectMenu()) {
                    if (ctx.customId === ButtonIds.CategorySelection) {
                        cache.category = ctx.values[0];

                        interaction
                            .editReply({
                                embeds: [
                                    basicEmbed(user, { questionMark: true })
                                        .setTimestamp(end)
                                        .setTitle('Compteurs')
                                        .setDescription(
                                            `La catégorie a été définie sur ${pingChan(cache.category, 'text')}\nChoisissez les compteurs que vous voulez activer`
                                        )
                                ],
                                components: [
                                    row(
                                        new StringSelectMenuBuilder()
                                            .setCustomId(ButtonIds.SelectCounters)
                                            .setMaxValues(countersManager.data.length)
                                            .setMinValues(1)
                                            .setOptions(
                                                countersManager.data.map((x) => ({
                                                    label: x.name,
                                                    description: x.description,
                                                    value: x.id.toString()
                                                }))
                                            )
                                    )
                                ]
                            })
                            .catch(log4js.trace);

                        ctx.deferUpdate().catch(log4js.trace);
                        state = 'selectCounters';
                        return;
                    }
                }
                if (ctx.isStringSelectMenu()) {
                    if (ctx.customId === ButtonIds.SelectCounters) {
                        cache.selected = ctx.values.map((x) => parseInt(x)) as CounterId[];

                        ctx.deferUpdate().catch(log4js.trace);
                        interaction
                            .editReply({
                                embeds: [
                                    basicEmbed(user, { questionMark: true })
                                        .setTimestamp(end)
                                        .setTitle('Noms')
                                        .setDescription(
                                            `Vous avez sélectionné **${cache.selected.length}** compteur${plurial(cache.selected)} ( ${cache.selected.map((x) => countersManager.data.find((y) => y.id === x).name).join(', ')} )\nAppuyez sur le bouton pour configurer leur nom.\n\n💡\n> Pour faire apparaitre le compte du compteur, écrivez \`{cmp}\` dans le nom.\n> Exemple : \`Membres : {cmp}\` affichera ${((count: number) => `\`Membres : ${count.toLocaleString()}\` si il y a **${count.toLocaleString()}** membres`)(random({ max: 2600, min: 120 }))}`
                                        )
                                ],
                                components: [
                                    row(
                                        buildButton({
                                            label: 'Nommer les boutons',
                                            buttonId: 'NameCounters',
                                            style: 'Primary'
                                        })
                                    )
                                ]
                            })
                            .catch(log4js.trace);
                        state = 'naming';
                        return;
                    }
                }
            });

            collector.on('end', (_c, reason) => {
                if (reason === 'ended') {
                    return resolve(cache);
                }

                interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
                return resolve('canceled');
            });
        });
    }
);
