import { modulesManager, giveaways } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForMessage } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    InteractionReplyOptions,
    Message,
    Role,
    TextChannel
} from 'discord.js';
import timePrecondition from '../../preconditions/time';
import {
    addTimeDoc,
    basicEmbed,
    buildButton,
    capitalize,
    checkCtx,
    confirm,
    displayDate,
    evokerColor,
    getMsgUrl,
    notNull,
    numerize,
    pagination,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    row,
    subcmd
} from '../../utils/toolbox';
import ms from 'ms';
import { cancelButton } from '../../data/buttons';
import replies from '../../data/replies';
import { getRolePerm, util } from '../../utils/functions';
import { GWListType } from '../../typings/commands';
import { confirmReturn } from '../../typings/functions';
import { giveaway, giveawayInput } from '../../typings/giveaway';
import SendAndDelete from '../../process/SendAndDelete';

export default new DraverCommand({
    name: 'giveaway',
    module: 'giveaways',
    description: 'Gère les giveaways sur le serveur',
    permissions: ['ManageChannels', 'ManageGuild'],
    preconditions: [preconditions.GuildOnly, moduleEnabled, timePrecondition],
    options: [
        {
            name: 'démarrer',
            description: 'Démarre un giveaway',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'récompense',
                    description: 'Récompense du giveaway',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'gagnants',
                    description: 'Nombre de gagnants du giveaway',
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    name: 'temps',
                    description: 'Temps du giveaway',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'salon',
                    description: 'Salon du giveaway',
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    name: 'bonus',
                    description: 'Identifiants des rôles bonus (séparés par des espaces)',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'requis',
                    description: 'Identifiants des rôles requis (séparés par des espaces)',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'interdits',
                    description: 'Identifiants des rôles interdits (séparés par des espaces)',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'niveau',
                    description: 'Niveau minimum pour participer',
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    name: 'invitations',
                    description: "Nombre d'invitations minimum pour participer",
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            name: 'créer',
            description: 'Crée un giveaway dans le salon',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'liste',
            description: 'Affiche la liste des giveaways',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'giveaways',
                    description: 'Type de giveaways que vous voulez afficher',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: 'Tous',
                            value: GWListType.All
                        },
                        {
                            name: 'En cours',
                            value: GWListType.Current
                        },
                        {
                            name: 'Terminés',
                            value: GWListType.Ended
                        }
                    ]
                }
            ]
        },
        {
            name: 'analyser',
            description: 'Analyse un giveaway',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du message du giveaway',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'reroll',
            description: 'Reroll un giveaway terminé',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du message du giveaway',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'terminer',
            description: 'Termine un giveaway',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du giveaway',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un giveaway',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    description: 'Identifiant du message du giveaway'
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'démarrer') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;
        const reward = options.getString('récompense');
        const time = ms(options.getString('temps'));

        const roleFilter = (s: string) => s.length > 0;
        const bonuses = (options.getString('bonus') ?? '').split(/ +/g).filter(roleFilter);
        const required = (options.getString('requis') ?? '').split(/ +/g).filter(roleFilter);
        const denied = (options.getString('interdits') ?? '').split(/ +/g).filter(roleFilter);
        const winnerCount = options.getInteger('gagnants');
        const level = options.getInteger('niveau') ?? 0;
        const invites = options.getInteger('invitations') ?? 0;

        await interaction.deferReply();

        const gw = (await giveaways
            .createGiveaway({
                guild_id: interaction.guild.id,
                channel,
                winnerCount,
                bonus_roles: bonuses.length > 0 ? bonuses : [],
                reward,
                required_roles: required.length > 0 ? required : [],
                denied_roles: denied.length > 0 ? denied : [],
                hoster_id: interaction.user.id,
                time: time,
                required_level: level,
                required_invitations: invites
            })
            .catch(console.log)) as giveaway;

        if (!gw)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle('Erreur')
                            .setDescription(
                                `Une erreur a eu lieu lors de la création du giveaway.\nÇa peut être lié au fait que je n'ai pas les permissions d'envoyer des messages dans ${pingChan(
                                    channel
                                )}`
                            )
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Giveaway crée')
                        .setDescription(
                            `Le giveaway avec la récompense **${reward}** a été crée dans ${pingChan(
                                channel
                            )}.\nIl se finit ${displayDate(time + Date.now())} avec ${numerize(
                                winnerCount
                            )} gagnant${plurial(winnerCount)}`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'créer') {
        const data: giveawayInput = {
            reward: `Un splendide T-Shirt Draver`,
            required_roles: [],
            denied_roles: [],
            bonus_roles: [],
            winnerCount: 1,
            time: 3600000,
            hoster_id: interaction.user.id,
            guild_id: interaction.guild.id,
            channel: interaction.channel as TextChannel,
            required_level: 0,
            required_invitations: 0
        };

        let hasCurrentAction = false;
        const basic = (fetch?: boolean): InteractionReplyOptions => {
            const currentAction = hasCurrentAction;
            const components = [
                row(
                    buildButton({
                        label: 'Récompense',
                        id: 'reward',
                        style: 'Primary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: 'Gagnants',
                        id: 'winnerCount',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: 'Temps',
                        id: 'time',
                        style: 'Secondary',
                        disabled: currentAction
                    })
                ),
                row(
                    buildButton({
                        label: 'Salon',
                        id: 'channel',
                        style: 'Primary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: 'Bonus',
                        id: 'bonus_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: 'Requis',
                        id: 'required_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    }),
                    buildButton({
                        label: 'Interdits',
                        id: 'denied_roles',
                        style: 'Secondary',
                        disabled: currentAction
                    })
                ),
                row(
                    buildButton({
                        label: 'Niveau',
                        id: 'level',
                        style: 'Secondary',
                        disabled: !modulesManager.enabled(interaction.guild.id, 'level') || currentAction
                    }),
                    buildButton({
                        label: 'Invitations',
                        id: 'invitations',
                        style: 'Secondary',
                        disabled: !modulesManager.enabled(interaction.guild.id, 'invitations') || currentAction
                    }),
                    buildButton({
                        label: 'Valider',
                        id: 'validate',
                        style: 'Success',
                        disabled: currentAction
                    }),
                    cancelButton().setDisabled(currentAction)
                )
            ];
            return {
                embeds: [
                    basicEmbed(interaction.user)
                        .setColor('Grey')
                        .setTitle('Création de giveaway')
                        .setDescription(`Appuyez sur les boutons ci-dessous pour configurer votre giveaway`)
                        .setFields(
                            ...[
                                {
                                    name: 'Récompense',
                                    value: data.reward,
                                    inline: true
                                },
                                {
                                    name: 'Gagnants',
                                    value: numerize(data.winnerCount),
                                    inline: true
                                },
                                {
                                    name: 'Prendra fin',
                                    value: displayDate(Date.now() + data.time),
                                    inline: true
                                },
                                {
                                    name: 'Salon',
                                    value: pingChan(data.channel),
                                    inline: false
                                },
                                {
                                    name: 'Rôles bonus',
                                    value:
                                        data.bonus_roles?.length > 0
                                            ? data.bonus_roles.map(pingRole).join(' ')
                                            : 'Pas de rôles bonus',
                                    inline: true
                                },
                                {
                                    name: 'Rôles requis',
                                    value:
                                        data.required_roles?.length > 0
                                            ? data.required_roles.map(pingRole).join(' ')
                                            : 'Pas de rôles requis',
                                    inline: true
                                },
                                {
                                    name: 'Rôles interdits',
                                    value:
                                        data.denied_roles?.length > 0
                                            ? data.denied_roles?.map(pingRole).join(' ')
                                            : 'Pas de rôles intedits',
                                    inline: true
                                },
                                {
                                    name: '\u200b',
                                    value: '\u200b',
                                    inline: false
                                },
                                modulesManager.enabled(interaction.guild.id, 'invitations')
                                    ? {
                                          name: 'Invitations',
                                          value:
                                              data.required_invitations === 0
                                                  ? 'Aucune limite'
                                                  : `**${numerize(data.required_invitations)}** invitation${plurial(
                                                        data.required_invitations
                                                    )}`,
                                          inline: true
                                      }
                                    : null,
                                modulesManager.enabled(interaction.guild.id, 'level')
                                    ? {
                                          name: 'Niveaux',
                                          value:
                                              data.required_level === 0
                                                  ? 'Aucune limite'
                                                  : `Niveau ${numerize(data.required_level)}`,
                                          inline: true
                                      }
                                    : null
                            ].filter(notNull)
                        )
                ],
                components: components,
                fetchReply: notNull(fetch) ? fetch : false
            };
        };

        const msg = (await interaction.reply(basic()).catch(() => {})) as unknown as Message<true>;
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({
            time: 600000,
            componentType: ComponentType.Button
        });

        const reedit = () => {
            interaction.editReply(basic()).catch(() => {});
        };

        hasCurrentAction = false;
        collector.on('collect', async (ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;

            if (ctx.customId === 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});
                return collector.stop('canceled');
            }
            if (ctx.customId === 'validate') {
                interaction
                    .editReply({
                        embeds: [replies.wait(interaction.user)],
                        components: []
                    })
                    .catch(() => {});

                const gw = (await giveaways.createGiveaway(data).catch(() => {})) as giveaway;
                if (!gw) {
                    interaction
                        .editReply({
                            embeds: [
                                basicEmbed(interaction.user)
                                    .setTitle('Erreur')
                                    .setDescription(
                                        `Je n'ai pas pu créer de giveaway.\nAssurez-vous que je possède bien les permissions **${getRolePerm(
                                            'SendMessages'
                                        )}** et **${getRolePerm('EmbedLinks')}** dans le salon ${pingChan(
                                            data.channel
                                        )}`
                                    )
                                    .setColor(evokerColor(interaction.guild))
                            ]
                        })
                        .catch(() => {});
                }
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Giveaway crée')
                                .setDescription(`Un giveaway a été crée dans ${pingChan(data.channel)}`)
                        ]
                    })
                    .catch(() => {});
                return collector.stop('sent');
            }

            const setDeleteTmst = () => {
                setTimeout(() => {
                    ctx.deleteReply().catch(() => {});
                }, 10000);
            };

            interaction.editReply(basic()).catch(() => {});

            hasCurrentAction = true;
            if (ctx.customId === 'channel') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Salon')
                                .setColor('Grey')
                                .setDescription(
                                    `Dans quel salon voulez-vous lancer le giveaway ?\nRépondez par un nom, un identifiant ou une mention dans le chat.\n${util(
                                        'cancelMsg'
                                    )}`
                                )
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;
                if (!rep) return;

                const reply = (await waitForMessage({
                    channel: rep.channel as TextChannel,
                    user: interaction.user,
                    time: 120000
                }).catch(() => {})) as Message<true>;

                hasCurrentAction = false;
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({ embeds: [replies.cancel(interaction)] }).catch(() => {});
                    setDeleteTmst();
                    reedit();
                    return;
                }
                if (reply?.deletable) reply.delete().catch(() => {});
                const channel =
                    interaction.guild.channels.cache.find((x) => x.name === reply.content || x.id === reply.content) ||
                    interaction.guild.channels.cache.get(reply.content) ||
                    reply.mentions.channels.first();

                if (!channel || channel.type !== ChannelType.GuildText) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Salon invalide')
                                .setDescription(`Je n'ai pas trouvé de salon, ou alors ce n'est pas un salon textuel.`)
                                .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                    setDeleteTmst();
                    return reedit();
                }

                ctx.deleteReply(rep).catch(() => {});
                data.channel = channel;
                reedit();
            }
            if (ctx.customId.includes('roles')) {
                const type =
                    ctx.customId === 'roles_required'
                        ? 'rôles requis'
                        : ctx.customId === 'denied_roles'
                          ? 'rôles interdits'
                          : 'rôles bonus';
                const rep = (await ctx
                    .reply({
                        fetchReply: true,
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle(capitalize(type))
                                .setDescription(
                                    `Quels sont les rôles que vous voulez ajouter ?\nUtilisez un nom, un identifiant ou une mention.\n${util(
                                        'cancelMsg'
                                    )}\n> Répondez par \`vide\` pour vider les rôles`
                                )
                                .setColor('Grey')
                        ]
                    })
                    .catch(() => {})) as Message<true>;
                if (!rep) return;

                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;

                if (reply.deletable) reply.delete().catch(() => {});

                hasCurrentAction = false;
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    setDeleteTmst();

                    reedit();
                    return;
                }
                if (reply.content.toLowerCase() === 'vide') {
                    data[ctx.customId] = [];
                    reedit();
                    ctx.deleteReply(rep).catch(() => {});
                    return;
                }
                const names = reply.content.split(/ +/g);
                const roles: Role[] = reply.mentions.roles.toJSON();

                for (const name of names) {
                    const role =
                        interaction.guild.roles.cache.get(name) ||
                        interaction.guild.roles.cache.find((x) => x.name === name);
                    if (role && !roles.includes(role)) roles.push(role);
                }

                if (roles.length === 0) {
                    setDeleteTmst();
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Aucun rôle')
                                .setDescription(
                                    `Je n'ai trouvé aucun rôle correspondant à votre recherche.\nIl se peut que ce ou ces rôles soient déjà dans la liste`
                                )
                                .setColor('Grey')
                        ]
                    }).catch(() => {});
                    reedit();
                    return;
                }

                const checkRoles = (roles: string[]) => {
                    const isInBothArrays = (arr1: string[], arr2: string[]) => arr1.some((item) => arr2.includes(item));

                    switch (ctx.customId) {
                        case 'denied_roles':
                            if (isInBothArrays(roles, data.bonus_roles) || isInBothArrays(roles, data.required_roles))
                                return false;
                            break;
                        case 'required_roles':
                            if (isInBothArrays(roles, data.bonus_roles) || isInBothArrays(roles, data.denied_roles))
                                return false;
                            break;
                        case 'bonus_roles':
                            if (isInBothArrays(roles, data.denied_roles) || isInBothArrays(roles, data.required_roles))
                                return false;
                            break;
                    }

                    return true;
                };

                const valid = checkRoles(roles.map((x) => x.id));

                if (!valid) {
                    setDeleteTmst();
                    reedit();
                    ctx.editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Rôles invalide')
                                .setDescription(
                                    `Un des rôles que vous avez saisi existe déjà dans un autre champs de rôles (rôles requis, rôles bonus ou rôles interdits)`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    });
                    return;
                }
                ctx.deleteReply(rep).catch(() => {});
                data[ctx.customId] = roles.map((x) => x.id);
                reedit();
            }
            if (ctx.customId === 'winnerCount') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Nombre de gagnants')
                                .setDescription(
                                    `Vous allez configurer le nombre de gagnants\nSaisissez un nombre entre 1 et 100 dans le chat.\n${util(
                                        'cancelMsg'
                                    )}`
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content === 'cancel') {
                    interaction
                        .editReply({
                            embeds: [replies.cancel(interaction)]
                        })
                        .catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }
                const int = parseInt(reply.content);
                if (!int || isNaN(int) || int < 1 || int > 100) {
                    reedit();
                    setDeleteTmst();
                    interaction
                        .editReply({
                            embeds: [replies.invalidNumber(interaction.member as GuildMember)]
                        })
                        .catch(() => {});
                    return;
                }
                data.winnerCount = int;
                reedit();
                ctx.deleteReply(rep).catch(() => {});
            }
            if (ctx.customId === 'time') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Durée du giveaway')
                                .setDescription(
                                    `Quel est le temps du giveaway ?\nRépondez dans le chat.${addTimeDoc(
                                        interaction.user.id
                                    )}\n${util('cancelMsg')}`
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;

                hasCurrentAction = false;
                if (reply.deletable) reply.delete().catch(() => {});

                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const time = ms(reply.content);
                if (!time || isNaN(time)) {
                    ctx.editReply({
                        embeds: [replies.invalidTime((interaction?.member as GuildMember) ?? interaction.user)]
                    }).catch(() => {});
                    setDeleteTmst();
                    reedit();
                    return;
                }

                data.time = time;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'reward') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Récompense')
                                .setDescription(
                                    `Quelle est la récompense du giveaway ?\nRépondez dans le chat\n${util(
                                        'cancelMsg'
                                    )}`
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                data.reward = reply.content;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'level') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Niveau')
                                .setDescription(
                                    `Quel est le niveau minimum pour participer au giveaway ? ?\nRépondez dans le chat\n${util(
                                        'cancelMsg'
                                    )}`
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const int = parseInt(reply?.content);
                if (!int || isNaN(int) || int < 0) {
                    reedit();
                    SendAndDelete.process(
                        { embeds: [replies.invalidNumber(interaction.member as GuildMember)] },
                        interaction.channel as TextChannel
                    );
                    return;
                }
                data.required_level = int;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
            if (ctx.customId === 'invitations') {
                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Niveau')
                                .setDescription(
                                    `Combien d'invitations sont nécessaires pour participer au giveaway ? ?\nRépondez dans le chat\n${util(
                                        'cancelMsg'
                                    )}`
                                )
                                .setColor('Grey')
                        ],
                        fetchReply: true
                    })
                    .catch(() => {})) as Message<true>;

                reedit();
                const reply = (await waitForMessage({
                    channel: interaction.channel as TextChannel,
                    user: interaction.user
                }).catch(() => {})) as Message<true>;
                hasCurrentAction = false;

                if (reply.deletable) reply.delete().catch(() => {});
                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({
                        embeds: [replies.cancel(interaction)]
                    }).catch(() => {});
                    reedit();
                    setDeleteTmst();
                    return;
                }

                const int = parseInt(reply?.content);
                if (!int || isNaN(int) || int < 0) {
                    reedit();
                    SendAndDelete.process(
                        { embeds: [replies.invalidNumber(interaction.member as GuildMember)] },
                        interaction.channel as TextChannel
                    );
                    return;
                }
                data.required_invitations = int;
                ctx.deleteReply(rep).catch(() => {});
                reedit();
            }
        });
        collector.on('end', (_ctx, reason) => {
            if (!['sent', 'canceled'].includes(reason)) {
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});
            }
        });
    }
    if (cmd === 'liste') {
        const type = (options.getString('giveaways') as GWListType) ?? GWListType.Current;
        const list = giveaways.list.ended.concat(giveaways.list.giveaways);

        console.log(type);
        const gws = list
            .filter((x) => x.guild_id === interaction.guild.id)
            .filter((x) => {
                if (type === GWListType.All) return x.guild_id === interaction.guild.id;
                if (type === GWListType.Current) return x.guild_id === interaction.guild.id && x.ended === false;
                if (type === GWListType.Ended) return x.guild_id === interaction.guild.id && x.ended === true;
                return true;
            });

        const typeStr = type === GWListType.All ? '' : type === GWListType.Current ? ' en cours' : ' terminé';
        if (gws.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de giveaways')
                            .setDescription(`Il n'y a aucun giveaway${typeStr} sur ce serveur`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Giveaways')
                .setDescription(`Il y a **${numerize(gws.length)}** giveaway${plurial(gws.length)} sur le serveur`);
        };
        const mapField = (embed: EmbedBuilder, gw: giveaway) => {
            return embed.addFields({
                name: gw.reward,
                value: `Par ${pingUser(gw.hoster_id)} ( \`${gw.hoster_id}\` ) dans ${pingChan(
                    gw.channel_id
                )}\n> Finit ${displayDate(gw.endsAt)}\n> ${numerize(gw.winnerCount)} gagnant${plurial(
                    gw.winnerCount
                )} - **${gw.ended ? 'terminé' : 'en cours'}**`,
                inline: false
            });
        };

        if (gws.length <= 5) {
            const embed = basic();
            for (const gw of gws) {
                mapField(embed, gw);
            }

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds: EmbedBuilder[] = [basic()];
            gws.forEach((log, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                mapField(embeds[embeds.length - 1], log);
            });

            pagination({
                interaction,
                user: interaction.user,
                embeds
            });
        }
    }
    if (cmd === 'analyser') {
        const id = options.getString('identifiant');
        const gw = giveaways.fetchGiveaway(id, true);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de giveaway')
                            .setDescription(`Il n'y a pas de giveaway avec l'identifiant \`${id}\``)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const embed = basicEmbed(interaction.user, { draverColor: true })
            .setTitle(`Giveaway`)
            .setDescription(
                `Voici les informations pour le giveaway d'identifiant \`${gw.message_id}\`\n> Giveaway ${
                    gw.ended ? 'terminé' : 'en cours'
                }`
            );

        if (!gw.ended) {
            embed.addFields({
                name: 'Date de fin',
                value: displayDate(gw.endsAt),
                inline: true
            });
        }
        embed.addFields(
            {
                name: 'Offant',
                value: pingUser(gw.hoster_id) + ` ( \`${gw.hoster_id}\` )`,
                inline: true
            },
            {
                name: 'Salon',
                value: pingChan(gw.channel_id) + ` ( \`${gw.channel_id}\` ) `,
                inline: true
            },
            {
                name: 'Récompense',
                value: gw.reward,
                inline: false
            },
            {
                name: 'Nombre de gagnants',
                value: numerize(gw.winnerCount),
                inline: true
            },
            {
                name: 'Participants',
                value: numerize(gw.participants.length),
                inline: true
            }
        );
        if (gw.ended) {
            embed.addFields({
                name: 'Gagnants',
                value:
                    gw.winners.length > 0
                        ? `${numerize(gw.winners.length)} gagnant${plurial(gw.winners.length)} ( sur ${numerize(
                              gw.participants.length
                          )} participant${plurial(gw.participants.length)}, soit ${Math.floor(
                              (gw.winners.length * 100) / gw.participants.length
                          )}% des participants ) : ${gw.winners.map(pingUser).join(' ')}`
                        : 'Aucun gagnants',
                inline: false
            });
        }
        const names = {
            bonus_roles: 'Rôles bonus',
            denied_roles: 'Rôles interdits',
            required_roles: 'Rôles requis'
        };
        for (const roleList of ['bonus_roles', 'required_roles', 'denied_roles']) {
            if (gw[roleList].length > 0) {
                embed.addFields({
                    name: names[roleList],
                    value: gw[roleList].map(pingRole).join(' '),
                    inline: true
                });
            }
        }

        interaction
            .reply({
                embeds: [embed]
            })
            .catch(() => {});
    }
    if (cmd === 'reroll') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id, true) as giveaway;

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de giveaway')
                            .setDescription(`Il n'y a pas de giveaway d'identifiant \`${id}\``)
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        if (!gw.ended)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Giveaway non-terminé')
                            .setDescription(`Le giveaway n'est pas terminé`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        await interaction.deferReply({
            ephemeral: true
        });

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Reroll')
                .setDescription(
                    `Vous allez reroll [le giveaway](${getMsgUrl(gw)}) d'identifiant \`${
                        gw.message_id
                    }\` dans ${pingChan(gw.channel_id)}.\nVoulez-vous continuer ?`
                )
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        const result = await giveaways.reroll(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Reroll échoué')
                            .setDescription(`Le reroll de [ce giveaway](${getMsgUrl(gw)}) a échoué`)
                            .setColor(evokerColor(interaction.guild))
                    ],
                    components: []
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Giveaway rerollé')
                        .setDescription(`[Le giveaway](${getMsgUrl(gw)}) a été reroll`)
                ],
                components: []
            })
            .catch(() => {});
    }
    if (cmd === 'terminer') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de giveaway')
                            .setDescription(`Il n'y a pas de giveaway d'identifiant \`${id}\``)
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        if (gw.ended)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Giveaway terminé')
                            .setDescription(
                                `Le giveaway est déjà terminé.\nSi vous voulez changer les gagnants, utilisez plutôt \`/giveaway reroll\``
                            )
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setDescription(
                    `Vous allez terminer [ce giveaway](${getMsgUrl(gw)}) dans ${pingChan(
                        gw.channel_id
                    )}.\nVoulez-vous continuer ?`
                )
                .setTitle('Confirmation')
        }).catch(() => {})) as confirmReturn;

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        const result = await giveaways.endGiveaway(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Terminaison échouée')
                            .setDescription(`[Le giveaway](${getMsgUrl(gw)}) n'a pas pu être terminé`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Giveaway terminé')
                        .setDescription(`[Le giveaway](${getMsgUrl(gw)}) a été terminé`)
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'supprimer') {
        const id = options.getString('identifiant') ?? interaction.channel.id;
        const gw = giveaways.fetchGiveaway(id, true);

        if (!gw || gw.guild_id !== interaction.guild.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de giveaway')
                            .setDescription(`Il n'y a pas de giveaway d'identifiant \`${id}\``)
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setDescription(
                    `Vous allez supprimer [ce giveaway](${getMsgUrl(gw)}) dans ${pingChan(
                        gw.channel_id
                    )}.\nVoulez-vous continuer ?`
                )
                .setTitle('Confirmation')
        }).catch(() => {})) as confirmReturn;

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        const result = await giveaways.deleteGiveaway(gw.message_id);
        if (!result || typeof result === 'string')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Terminaison échouée')
                            .setDescription(`[Le giveaway](${getMsgUrl(gw)}) n'a pas pu être supprimé`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Giveaway terminé')
                        .setDescription(`[Le giveaway](${getMsgUrl(gw)}) a été supprimé`)
                ]
            })
            .catch(() => {});
    }
});
