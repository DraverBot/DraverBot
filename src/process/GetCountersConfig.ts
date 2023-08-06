import {
    ButtonBuilder,
    ButtonInteraction,
    CommandInteraction,
    ComponentType,
    GuildMember,
    Message,
    User
} from 'discord.js';
import { Process } from '../structures/Process';
import { basicEmbed, boolEmoji, buildButton, confirm, notNull, row } from '../utils/toolbox';
import { cancelButton } from '../data/buttons';
import { log4js, waitForInteraction } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import { counterType, createCountersType } from 'discord-count-channels/dist';
import replies from '../data/replies';

export default new Process(
    'get counters config',
    async ({
        user,
        interaction,
        time = 300000
    }: {
        user: User;
        interaction: CommandInteraction;
        time?: number;
    }): Promise<'cancel' | 'error' | createCountersType> => {
        return new Promise(async (resolve) => {
            const msg = (await interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Configuration des compteurs')
                            .setDescription(
                                `Vous êtes en train de configurer les compteurs.\n\nVoulez-vous les configurer vous-même ou utiliser la configuration par défaut ?`
                            )
                    ],
                    components: [
                        row(
                            buildButton({
                                label: 'Configuration personnalisée',
                                style: 'Primary',
                                buttonId: 'ConfigCustomCounters'
                            }),
                            buildButton({
                                label: 'Configuration par défaut',
                                buttonId: 'ConfigDefaultCounters',
                                style: 'Primary'
                            }),
                            cancelButton()
                        )
                    ],
                    fetchReply: true
                })
                .catch(log4js.trace)) as Message<true>;
            if (!msg) return resolve('error');

            const configRep = await waitForInteraction({
                componentType: ComponentType.Button,
                message: msg,
                user
            }).catch(log4js.trace);
            if (configRep) await configRep.deferUpdate().catch(log4js.trace);

            if (!configRep || configRep.customId === 'cancel') return resolve('cancel');
            if (configRep.customId === ButtonIds.ConfigDefaultCounters)
                return resolve({
                    order: ['all', 'humans', 'bots'],
                    channelsType: 'voice',
                    guild: interaction.guild,
                    names: {
                        all: `Membres: {count}`,
                        bots: `Bots: {count}`,
                        humans: 'Utilisateurs: {count}',
                        category: '📊 Statistiques'
                    },
                    voiceJoinable: false,
                    locale: 'fr',
                    enable: {
                        all: true,
                        bots: true,
                        humans: true
                    }
                });

            const ids = {
                EditOrder: 'counters.modifyOrder',
                EditType: 'counters.editType',
                EditNames: 'counters.editNames',
                ChangeJoinable: 'counters.switchJoinable',
                ChangeState: 'counters.changeState',
                VoiceChannel: 'counters.channel.type.voice',
                TextChannel: 'counters.channel.type.text',
                StageChannel: 'counters.channel.type.stage',
                EnableCounter: 'counters.enable',
                DisableCounter: 'counters.disable',
                All: 'counters.all',
                Bots: 'counters.bots',
                Humans: 'counters.humans',
                Category: 'counters.category',
                Validate: 'counters.creation.validate',
                Cancel: 'counters.cancel'
            };
            const id = (key: keyof typeof ids) => id[key];
            const cache: createCountersType = {
                order: ['all', 'humans', 'bots'],
                channelsType: 'voice',
                guild: interaction.guild,
                names: {
                    all: `Membres: {count}`,
                    bots: `Bots: {count}`,
                    humans: 'Utilisateurs: {count}',
                    category: '📊 Statistiques'
                },
                voiceJoinable: false,
                locale: 'fr',
                enable: {
                    all: true,
                    bots: true,
                    humans: true
                }
            };
            const getCounter = (counter: counterType) => {
                const keys: Record<counterType, string> = {
                    all: 'total',
                    humans: 'humains',
                    bots: 'bots'
                };

                return keys[counter];
            };
            const embed = () => {
                const keys: Record<'all' | 'bots' | 'humans', string> = {
                    all: 'total',
                    humans: 'humains',
                    bots: 'bots'
                };
                const embed = basicEmbed(user, { questionMark: true })
                    .setTitle('Configuration des compteurs')
                    .setDescription(
                        `Vous êtes en train de configurer les compteurs\n\nType des salons : \`${
                            cache.channelsType === 'voice'
                                ? 'vocal'
                                : cache.channelsType === 'stage'
                                ? 'conférences'
                                : 'textuels'
                        }\`${
                            cache.channelsType === 'text'
                                ? ''
                                : `\nSalons rejoignables : ${boolEmoji(cache.voiceJoinable)}`
                        }`
                    )
                    .setFields(
                        {
                            name: 'Ordre',
                            value: cache.order.map((x) => keys[x]).join(', '),
                            inline: true
                        },
                        {
                            name: 'Catégorie',
                            value: cache.names.category,
                            inline: true
                        },
                        {
                            name: '\u200b',
                            value: '\u200b',
                            inline: false
                        },
                        {
                            name: 'Total',
                            value: `Activé : ${boolEmoji(cache.enable.all)}\nNom : \`${cache.names.all}\``,
                            inline: true
                        },
                        {
                            name: 'Humains',
                            value: `Activé : ${boolEmoji(cache.enable.humans)}\nNom : \`${cache.names.humans}\``,
                            inline: true
                        },
                        {
                            name: 'Bots',
                            value: `Activé : ${boolEmoji(cache.enable.bots)}\nNom : \`${cache.names.bots}\``,
                            inline: true
                        }
                    );

                return embed;
            };
            const components = (allDisabled = false) => {
                const empty = Object.keys(cache.enable).map((x) => cache.enable[x] === false).length === 3;

                const filter = (...btns: (ButtonBuilder | null)[]) => btns.filter(notNull);
                const conditionate = (condition: boolean, button: ButtonBuilder) => (condition ? button : null);
                return [
                    row(
                        ...filter(
                            buildButton({
                                label: 'Ordre',
                                style: 'Primary',
                                disabled: empty || allDisabled,
                                id: id('EditOrder')
                            }),
                            buildButton({
                                label: 'Type des salons',
                                style: 'Secondary',
                                id: id('EditType'),
                                disabled: empty || allDisabled
                            }),
                            conditionate(
                                cache.channelsType !== 'text',
                                buildButton({
                                    label: 'Joignabilité',
                                    style: 'Secondary',
                                    id: id('ChangeJoinable'),
                                    disabled: empty || allDisabled
                                })
                            ),
                            buildButton({
                                label: 'Noms',
                                style: 'Secondary',
                                id: id('EditNames'),
                                disabled: allDisabled
                            }),
                            buildButton({
                                label: 'Activation',
                                style: 'Secondary',
                                id: id('ChangeState'),
                                disabled: allDisabled
                            })
                        )
                    ),
                    row(
                        buildButton({
                            label: 'Valider',
                            style: 'Success',
                            id: id('Validate'),
                            disabled: empty || allDisabled
                        }),
                        buildButton({ label: 'Annuler', style: 'Danger', id: id('Cancel'), disabled: allDisabled })
                    )
                ];
            };

            await interaction
                .editReply({
                    embeds: [embed()],
                    components: components()
                })
                .catch(log4js.trace);

            const collector = msg.createMessageComponentCollector({
                time: time,
                componentType: ComponentType.Button
            });
            const update = async (disabled = false) => {
                await interaction
                    .editReply({
                        embeds: [embed()],
                        components: components(disabled)
                    })
                    .catch(log4js.trace);
            };
            const disableComponents = () => interaction.editReply({ components: components(true) }).catch(log4js.trace);
            const enableComponents = () => interaction.editReply({ components: components(false) }).catch(log4js.trace);

            const waitForCounter = async (ctx: ButtonInteraction): Promise<counterType | 'cancel'> => {
                return new Promise(async (resolve) => {
                    const message = (await ctx
                        .reply({
                            embeds: [
                                basicEmbed(user, { questionMark: true })
                                    .setTitle('Compteur')
                                    .setDescription(`Quel compteur souhaitez-vous configurer ?`)
                            ],
                            components: [
                                row(
                                    buildButton({ label: 'Total', id: id('All'), style: 'Primary' }),
                                    buildButton({ label: 'Humains', id: id('Humans'), style: 'Secondary' }),
                                    buildButton({ label: 'Bots', id: id('Bots'), style: 'Secondary' })
                                )
                            ],
                            ephemeral: true,
                            fetchReply: true
                        })
                        .catch(log4js.trace)) as Message<true>;
                    if (!msg) return resolve('cancel');
                    const rep = await waitForInteraction({
                        message: message,
                        componentType: ComponentType.Button,
                        user
                    }).catch(log4js.trace);

                    if (!rep) return resolve('cancel');
                    await rep.deferUpdate().catch(log4js.trace);
                    if (rep.customId === id('All')) return resolve('all');
                    if (rep.customId === id('Bots')) return resolve('bots');
                    if (rep.customId === id('Humans')) return resolve('humans');
                });
            };

            collector.on('collect', async (ctx) => {
                if (ctx.user.id !== user.id) {
                    ctx.reply({
                        embeds: [replies.replyNotAllowed(ctx.member as GuildMember)],
                        ephemeral: true
                    }).catch(log4js.trace);
                    return;
                }
                if (ctx.customId === id('Cancel')) {
                    interaction
                        .editReply({
                            components: components(true)
                        })
                        .catch(log4js.trace);

                    const cancelConfirm = await confirm({
                        interaction: ctx,
                        user,
                        embed: basicEmbed(user, { questionMark: true })
                            .setTitle('Annulation')
                            .setDescription(`Êtes-vous sûr de vouloir annuler la configuration ?`)
                    }).catch(log4js.trace);

                    if (!cancelConfirm || cancelConfirm === 'cancel' || !cancelConfirm.value) {
                        ctx.deleteReply().catch(log4js.trace);
                        return;
                    }

                    return collector.stop('cancel');
                }
                if (ctx.customId === id('Validate')) {
                    return collector.stop('validate');
                }
                if (ctx.customId === id('ChangeJoinable')) {
                    ctx.deferUpdate().catch(log4js.trace);
                    cache.voiceJoinable = !cache.voiceJoinable;

                    update();
                }
                if (ctx.customId === id('ChangeState')) {
                    disableComponents();

                    const counter = await waitForCounter(ctx);
                    if (counter === 'cancel') {
                        enableComponents();
                        ctx.editReply({
                            embeds: [replies.cancel()],
                            components: []
                        }).catch(log4js.trace);
                        return;
                    }
                    await ctx.editReply({
                        embeds: [
                            basicEmbed(user, { questionMark: true })
                                .setTitle('Configuration des compteurs')
                                .setDescription(
                                    `Voulez-vous **activer** ou **désactiver** le compteur **${getCounter(counter)}** ?`
                                )
                        ],
                        components: [
                            row(
                                buildButton({
                                    label: 'Activer',
                                    style: 'Success',
                                    id: id('EnableCounter'),
                                    disabled: cache.enable[counter]
                                }),
                                buildButton({
                                    label: 'Désactiver',
                                    style: 'Danger',
                                    id: id('DisableCounter'),
                                    disabled: !cache.enable[counter]
                                })
                            )
                        ]
                    });
                    const stateQuestion = await waitForInteraction({
                        componentType: ComponentType.Button,
                        user,
                        message: msg
                    }).catch(log4js.trace)

                    if (!stateQuestion) {
                        ctx.editReply({
                            embeds: [ replies.cancel() ],
                            components: []
                        }).catch(log4js.trace);
                        enableComponents()
                    }
                }
            });
            collector.on('end', (_c, reason) => {
                if (reason === 'cancel') {
                    interaction
                        .editReply({
                            embeds: [replies.cancel()],
                            components: []
                        })
                        .catch(log4js.trace);

                    return resolve('cancel');
                }
                if (reason === 'validate') {
                    return resolve(cache);
                }
            });
        });
    }
);
