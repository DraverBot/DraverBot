import { modulesManager, levelsManager, levelsChannels } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions, wait } from 'amethystjs';
import { ApplicationCommandOptionType, ChannelType, ComponentType, GuildMember, Message } from 'discord.js';
import replies from '../../data/replies';
import economyCheck from '../../preconditions/economyCheck';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { AdminLevelAddType } from '../../typings/commands';
import { confirmReturn } from '../../typings/functions';
import {
    addModLog,
    basicEmbed,
    buildButton,
    confirm,
    numerize,
    pingChan,
    plurial,
    random,
    row,
    subcmd
} from '../../utils/toolbox';
import { cancelButton } from '../../data/buttons';
import { ButtonIds } from '../../typings/buttons';
import GetChannel from '../../process/GetChannel';

export default new DraverCommand({
    name: 'adminlevel',
    module: 'administration',
    description: 'Gère les niveaux du serveur',
    permissions: ['ManageGuild', 'ManageMessages'],
    preconditions: [preconditions.GuildOnly, moduleEnabled, economyCheck],
    options: [
        {
            name: 'réinitialiser',
            description: "Réinitialise les niveaux du serveur ou d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre que vous voulez réinitialiser',
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            name: 'ajouter',
            description: 'Ajoute des niveaux ou des messages à un utilisateur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre dont vous voulez ajouter des niveaux',
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'type',
                    description: "Type de l'ajout que vous voulez faire",
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: 'Messages',
                            value: AdminLevelAddType.Messages
                        },
                        {
                            name: 'Niveaux',
                            value: AdminLevelAddType.Level
                        }
                    ]
                },
                {
                    name: 'montant',
                    description: 'Montant de niveaux/messages que vous voulez ajouter',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        },
        {
            name: 'salons',
            description: 'Gère la liste des salons',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'liste',
                    description: 'Affiche la liste des salons configurés',
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: 'configurer',
                    description: 'Configure la liste des salons',
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        },
        {
            name: "retirer",
            description: "Retire des niveaux ou des messages à un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: 'Membre auquel vous voulez retirer des niveaux',
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'type',
                    description: "Type du retrait que vous voulez faire",
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: 'Messages',
                            value: AdminLevelAddType.Messages
                        },
                        {
                            name: 'Niveaux',
                            value: AdminLevelAddType.Level
                        }
                    ]
                },
                {
                    name: 'montant',
                    description: 'Montant de niveaux/messages que vous voulez retirer',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'level'))
        return interaction
            .reply({
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'level' })],
                ephemeral: true
            })
            .catch(() => {});

    const cmd = subcmd(options);

    if (cmd === 'configurer') {
        // eslint-disable-next-line prefer-const
        let configured: 'bl' | 'wl' = levelsChannels.getConfigured(interaction) ?? 'wl';
        let data = levelsChannels.getLists(interaction)[configured];

        const embed = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Configuration')
                .setDescription(
                    `La liste est actuellement configurée en tant que **${
                        configured === 'bl' ? 'blacklist' : 'whitelist'
                    }**, ce qui signifie que les messages sont ${
                        configured === 'bl' ? `ignorés` : 'comptés uniquement'
                    } dans les salons listés\n${data.length > 0 ? data.map((x) => pingChan(x)).join(' ') : ''}`
                );
        };
        const components = (allDisabled = false) => {
            return [
                row(
                    buildButton({
                        label: 'Ajouter',
                        buttonId: 'LevelAddChannel',
                        style: 'Primary',
                        disabled: allDisabled || data.length === 25
                    }),
                    buildButton({
                        label: 'Retirer',
                        buttonId: 'LevelRemoveChannel',
                        style: 'Secondary',
                        disabled: allDisabled || data.length === 0
                    }),
                    buildButton({
                        label: `Changer en ${configured === 'bl' ? 'whitelist' : 'blacklist'}`,
                        buttonId: 'LevelListSwap',
                        style: 'Secondary',
                        disabled: allDisabled
                    }),
                    buildButton({
                        label: 'Vider',
                        buttonId: 'LevelPurgeList',
                        style: 'Secondary',
                        disabled: allDisabled || data.length === 0
                    })
                ),
                row(
                    buildButton({
                        label: 'Appliquer',
                        style: 'Success',
                        id: 'apply'
                    }),
                    cancelButton().setDisabled(allDisabled)
                )
            ];
        };
        const panel = (await interaction
            .reply({
                embeds: [embed()],
                components: components(),
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;
        if (!panel) return;

        const collector = panel.createMessageComponentCollector({
            time: 300000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (ctx) => {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    embeds: [replies.replyNotAllowed(ctx.member as GuildMember)],
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }

            if (ctx.customId === 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
                collector.stop('cancel');
            }
            if (ctx.customId === 'apply') {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Changements appliqués')
                                .setDescription(`Les changements ont été appliqués`)
                        ],
                        components: []
                    })
                    .catch(log4js.trace);
                collector.stop('apply');
            }
            if (ctx.customId === ButtonIds.LevelPurgeList) {
                data = [];

                ctx.deferUpdate().catch(log4js.trace);
                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.LevelListSwap) {
                configured = configured === 'bl' ? 'wl' : 'bl';

                ctx.deferUpdate().catch(log4js.trace);
                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.LevelAddChannel || ctx.customId === ButtonIds.LevelRemoveChannel) {
                const action = ctx.customId === ButtonIds.LevelAddChannel ? 'add' : 'remove';

                interaction
                    .editReply({
                        components: components(true)
                    })
                    .catch(log4js.trace);
                const channel = await GetChannel.process({
                    interaction: ctx,
                    embed: basicEmbed(interaction.user, { questionMark: true })
                        .setTitle('Salon')
                        .setDescription(
                            `Quel salon voulez-vous ${
                                action === 'add' ? 'ajouter' : 'retirer'
                            } ?\nRépondez dans le chat par un identifiant, un nom ou une mention.\nTapez \`cancel\` pour annuler`
                        ),
                    user: interaction.user,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory],
                    checks: [
                        {
                            check: (chan) => (action === 'add' ? !data.includes(chan.id) : data.includes(chan.id)),
                            reply: {
                                embeds: [
                                    basicEmbed(interaction.user, { evoker: interaction.guild })
                                        .setTitle('Salon invalide')
                                        .setDescription(
                                            action === 'add'
                                                ? `Ce salon est déjà dans la liste`
                                                : "Ce salon n'est pas dans la liste"
                                        )
                                ]
                            }
                        }
                    ]
                });

                if (channel === 'cancel' || channel === "time's up") {
                    ctx.deleteReply().catch(log4js.trace);
                    interaction
                        .editReply({
                            components: components()
                        })
                        .catch(log4js.trace);
                    return;
                }

                ctx.deleteReply().catch(log4js.trace);

                if (action === 'add') {
                    data.push(channel.id);
                } else {
                    data = data.filter((x) => x !== channel.id);
                }

                interaction
                    .editReply({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
        });

        collector.on('end', async (_c, reason) => {
            if (reason === 'apply') {
                if (configured !== levelsChannels.getConfigured(interaction)) {
                    levelsChannels.swap(interaction);
                    await wait(500);
                }
                levelsChannels.setList(interaction.guild, data);
            } else if (reason !== 'cancel') {
                interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
            }
        });
    }
    if (cmd === 'liste') {
        const configured = levelsChannels.getConfigured(interaction);
        const list = levelsChannels.getLists(interaction)[configured];

        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Liste vide')
                            .setDescription(`La liste est vide, vous n'avez configuré aucun salon`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(configured === 'bl' ? 'Blacklist de salons' : 'Whitelist de salons')
                        .setDescription(
                            `Les messages ${
                                configured === 'bl' ? `ne sont pas comptés` : 'sont comptés uniquement'
                            } dans ces salons :\n${list.map((x) => pingChan(x)).join(' ')}`
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'réinitialiser') {
        const user = options.getUser('membre');
        const target = user ? `de ${user}` : 'du serveur';

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Réinitialisation')
                .setDescription(
                    `Vous êtes sur le point de réinitialiser les niveaux ${target}.\nVoulez-vous continuer ?`
                )
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction.editReply({
            embeds: [replies.wait(interaction.user)],
            components: []
        });
        await levelsManager.reset(interaction.guild.id, user?.id);

        await addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            mod_id: interaction.user.id,
            member_id: user?.id,
            type: 'LevelReset'
        }).catch(() => {});

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Réinitialisation')
                                .setDescription(`Les niveaux ${target} ont été réinitialisés`)
                        ]
                    })
                    .catch(() => {});
            },
            random({ max: 6, min: 3 }) * 1000
        );
    }
    if (cmd === 'ajouter') {
        const user = options.getUser('membre');
        const amount = options.getInteger('montant');
        const type = options.getString('type') as AdminLevelAddType;
        const strType = type === AdminLevelAddType.Level ? 'niveau' : 'message';
        const plurialSuffix = type === AdminLevelAddType.Level ? 'x' : 's';

        const validation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Ajout de niveaux')
                .setDescription(
                    `Vous êtes sur le point de rajouter **${numerize(amount)} ${strType}${plurial(amount, {
                        plurial: plurialSuffix
                    })}** à ${user}.\nÊtes-vous sûr ?`
                )
        }).catch(() => {})) as confirmReturn;

        if (validation === 'cancel' || !validation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        await levelsManager.addXp({
            amount,
            user_id: user.id,
            type,
            guild_id: interaction.guild.id
        });

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Ajout de niveaux')
                                .setDescription(
                                    `${numerize(amount)} ${strType}${plurial(amount, {
                                        singular: ' a été ajouté',
                                        plurial: plurialSuffix + ' ont été ajoutés'
                                    })} à ${user}`
                                )
                        ],
                        components: []
                    })
                    .catch(() => {});
            },
            random({ max: 5, min: 2 }) * 1000
        );
    }
    if (cmd === 'retirer') {
        const user = options.getUser('membre');
        const amount = options.getInteger('montant');
        const type = options.getString('type') as AdminLevelAddType;
        const strType = type === AdminLevelAddType.Level ? 'niveau' : 'message';
        const plurialSuffix = type === AdminLevelAddType.Level ? 'x' : 's';

        const validation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Retrait de niveaux')
                .setDescription(
                    `Vous êtes sur le point de retirer **${numerize(amount)} ${strType}${plurial(amount, {
                        plurial: plurialSuffix
                    })}** à ${user}.\nÊtes-vous sûr ?`
                )
        }).catch(() => {})) as confirmReturn;

        if (validation === 'cancel' || !validation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});

        await levelsManager.removeXp({
            amount,
            user_id: user.id,
            type,
            guild_id: interaction.guild.id
        });

        setTimeout(
            () => {
                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Retrait de niveaux')
                                .setDescription(
                                    `${numerize(amount)} ${strType}${plurial(amount, {
                                        singular: ' a été retiré',
                                        plurial: plurialSuffix + ' ont été retirés'
                                    })} à ${user}`
                                )
                        ],
                        components: []
                    })
                    .catch(() => {});
            },
            random({ max: 5, min: 2 }) * 1000
        );
    }
});
