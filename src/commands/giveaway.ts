import { AmethystCommand, waitForMessage } from "amethystjs";
import moduleEnabled from "../preconditions/moduleEnabled";
import { ApplicationCommandOptionType, ChannelType, ComponentType, InteractionReplyOptions, Message, TextChannel } from "discord.js";
import timePrecondition from "../preconditions/time";
import { basicEmbed, buildButton, checkCtx, displayDate, evokerColor, notNull, numerize, pingChan, pingRole, plurial, row, subcmd } from "../utils/toolbox";
import ms from "ms";
import { Giveaway, giveawayInput } from "discordjs-giveaways";
import moment from "moment";
import { cancelButton } from "../data/buttons";
import replies from "../data/replies";
import { getPerm, util } from "../utils/functions";

export default new AmethystCommand({
    name: 'giveaway',
    description: "Gère les giveaways sur le serveur",
    permissions: ['ManageChannels', 'ManageGuild'],
    preconditions: [moduleEnabled, timePrecondition],
    options: [
        {
            name: "démarrer",
            description: "Démarre un giveaway",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'récompense',
                    description: "Récompense du giveaway",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'gagnants',
                    description: "Nombre de gagnants du giveaway",
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                },
                {
                    name: 'temps',
                    description: "Temps du giveaway",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'salon',
                    description: "Salon du giveaway",
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                    channelTypes: [ChannelType.GuildText]
                },
                {
                    name: 'bonus',
                    description: "Identifiants des rôles bonus (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'requis',
                    description: "Identifiants des rôles requis (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'interdits',
                    description: "Identifiants des rôles interdits (séparés par des espaces)",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: "créer",
            description: "Crée un giveaway dans le salon",
            type: ApplicationCommandOptionType.Subcommand
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
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

        await interaction.deferReply();

        const gw = await interaction.client.giveaways.createGiveaway({
            guild_id: interaction.guild.id,
            channel,
            winnerCount,
            bonus_roles: bonuses.length > 0 ? bonuses : [],
            reward,
            required_roles: required.length > 0 ? required : [],
            denied_roles: denied.length > 0 ? denied : [],
            hoster_id: interaction.guild.id,
            time: time
        }).catch(console.log) as Giveaway;

        if (!gw) return interaction.editReply({
            embeds: [ basicEmbed(interaction.user)
                .setColor(evokerColor(interaction.guild))
                .setTitle("Erreur")
                .setDescription(`Une erreur a eu lieu lors de la création du giveaway.\nÇa peut être lié au fait que je n'ai pas les permissions d'envoyer des messages dans ${pingChan(channel)}`)
            ],
        }).catch(() => {});

        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Giveaway crée")
                .setDescription(`Le giveaway avec la récompense **${reward}** a été crée dans ${pingChan(channel)}.\nIl se finit ${displayDate(time + Date.now())} avec ${numerize(winnerCount)} gagnant${plurial(winnerCount)}`)
            ]
        }).catch(() => {});
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
        };
        const basic = (currentAction: boolean, fetch?: boolean): InteractionReplyOptions => {
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
                row(buildButton({
                    label: 'Valider',
                    id: 'validate',
                    style: 'Success',
                    disabled: currentAction
                }), cancelButton().setDisabled(currentAction))
            ]
            return {
                embeds: [
                    basicEmbed(interaction.user)
                        .setColor('Grey')
                        .setTitle("Création de giveaway")
                        .setDescription(`Appuyez sur les boutons ci-dessous pour configurer votre giveaway`)
                        .setFields(
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
                                name: "Prendra fin",
                                value: displayDate(Date.now() + data.time),
                                inline: true
                            },
                            {
                                name: "Salon",
                                value: pingChan(data.channel),
                                inline: false
                            },
                            {
                                name: "Rôles bonus",
                                value: data.bonus_roles?.length > 0 ? data.bonus_roles.map(pingRole).join(' ') : 'Pas de rôles bonus',
                                inline: true
                            },
                            {
                                name: "Rôles requis",
                                value: data.required_roles?.length > 0 ? data.required_roles.map(pingRole).join(' ') : 'Pas de rôles requis',
                                inline: true
                            },
                            {
                                name: "Rôles interdits",
                                value: data.denied_roles?.length > 0 ? data.denied_roles?.map(pingRole).join(' ') : 'Pas de rôles intedits',
                                inline: true
                            }
                        )
                ],
                components: components,
                fetchReply: notNull(fetch) ? fetch : false
            }
        }

        const msg = await interaction.reply(basic(false, true)).catch(() => { }) as unknown as Message<true>;
        if (!msg) return;

        const collector = msg.createMessageComponentCollector({
            time: 600000,
            componentType: ComponentType.Button
        });

        const reedit = () => {
            interaction.editReply(basic(false)).catch(() => {});
        }

        let hasCurrentAction = false;
        collector.on('collect', async(ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;

            if (ctx.customId === 'cancel') {
                interaction.editReply({
                    embeds: [replies.cancel()],
                    components: []
                }).catch(() => {});
                return collector.stop('canceled');
            }
            if (ctx.customId === 'validate') {
                interaction.editReply({
                    embeds: [ replies.wait(interaction.user) ],
                    components: []
                }).catch(() => {});

                const gw = await interaction.client.giveaways.createGiveaway(data).catch(() => {}) as Giveaway;
                if (!gw) {
                    interaction.editReply({
                        embeds: [ basicEmbed(interaction.user)
                            .setTitle("Erreur")
                            .setDescription(`Je n'ai pas pu créer de giveaway.\nAssurez-vous que je possède bien les permissions **${getPerm('SendMessages')}** et **${getPerm('EmbedLinks')}** dans le salon ${pingChan(data.channel)}`)
                            .setColor(evokerColor(interaction.guild))
                        ]
                    }).catch(() => {});
                }
                interaction.editReply({
                    embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle("Giveaway crée")
                        .setDescription(`Un giveaway a été crée dans ${pingChan(data.channel)}`)
                    ]
                }).catch(() => {});
                return collector.stop('sent');
            }

            const setDeleteTmst = () => {
                setTimeout(() => {
                    ctx.deleteReply().catch(() => {});
                }, 10000);
            }

            hasCurrentAction = true;
            interaction.editReply(basic(true)).catch(() => {});

            if (ctx.customId === 'channel') {
                const rep = await ctx.reply({
                    embeds: [ basicEmbed(interaction.user)
                        .setTitle("Salon")
                        .setColor('Grey')
                        .setDescription(`Dans quel salon voulez-vous lancer le giveaway ?\nRépondez par un nom, un identifiant ou une mention dans le chat.\n${util('cancelMsg')}`)
                    ],
                    fetchReply: true
                }).catch(() => {}) as Message<true>;
                if (!rep) return;

                const reply = await waitForMessage({
                    channel: rep.channel as TextChannel,
                    user: interaction.user,
                    time: 120000
                }).catch(() => {}) as Message<true>;

                if (!reply || reply.content.toLowerCase() === 'cancel') {
                    ctx.editReply({ embeds: [ replies.cancel() ] }).catch(() => {});
                    setDeleteTmst();
                    reedit();
                    return;
                }
                if (reply?.deletable) reply.delete().catch(() => {});
                const channel = interaction.guild.channels.cache.find(x => x.name === reply.content || x.id === reply.content) || interaction.guild.channels.cache.get(reply.content) || reply.mentions.channels.first();
                
                if (!channel || channel.type !== ChannelType.GuildText) {
                    ctx.editReply({
                        embeds: [basicEmbed(interaction.user)
                            .setTitle("Salon invalide")
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
                hasCurrentAction = false;
            }
        })
    }
});