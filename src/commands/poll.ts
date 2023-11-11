import { DraverCommand } from '../structures/DraverCommand';
import { log4js, preconditions, waitForInteraction } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ChannelType,
    ComponentType,
    GuildMember,
    Message,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, buildButton, confirm, numerize, pingChan, plurial, row, waitForReplies } from '../utils/toolbox';
import { cancelButton } from '../data/buttons';
import { ButtonIds } from '../typings/buttons';
import replies from '../data/replies';
import time from '../preconditions/time';
import ms from 'ms';

export default new DraverCommand({
    name: 'sondage',
    module: 'utils',
    description: 'Fait un sondage sur le serveur',
    options: [
        {
            name: 'démarrer',
            description: 'Démarre un sondage sur le serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'question',
                    description: 'Question à poser',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'durée',
                    description: 'Durée du sondage',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'salon',
                    description: 'Salon dans lequel faire le sondage',
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: 'terminer',
            description: 'Termine un sondage en cours',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'sondage',
                    description: 'Le sondage auquel vous voulez mettre fin',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled, time],
    permissions: ['ManageGuild']
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'démarrer') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;

        const choices: string[] = [];
        let choosable = 1;
        const time = ms(options.getString('durée'));
        const components = (allDisabled?: boolean) => [
            row(
                buildButton({
                    label: 'Ajouter',
                    buttonId: 'PollAddChoice',
                    style: 'Primary',
                    disabled: !!allDisabled ? true : choices.length === 25
                }),
                buildButton({
                    label: 'Supprimer',
                    buttonId: 'PollRemoveChoice',
                    style: 'Secondary',
                    disabled: !!allDisabled ? true : choices.length === 0
                }),
                buildButton({
                    label: 'Nombre de choix',
                    buttonId: 'PollChoices',
                    style: 'Secondary',
                    disabled: !!allDisabled ? true : choices.length <= 2
                }),
                buildButton({
                    label: 'Valider',
                    style: 'Success',
                    buttonId: 'PollValidate',
                    disabled: !!allDisabled
                }),
                cancelButton().setCustomId(ButtonIds.PollCancel).setDisabled(!!allDisabled)
            )
        ];
        const embed = () =>
            basicEmbed(interaction.user, { questionMark: true })
                .setTitle('Construction du sondage')
                .setDescription(
                    `Appuyez sur les boutons pour configurer le sondage${
                        choices.length > 0 ? `\n\nOptions :\n${choices.map((x) => `- ${x}`).join('\n')}` : ''
                    }`
                )
                .setFields({
                    name: "Nombre d'options",
                    value: `${numerize(choosable)} option${plurial(choosable, {
                        singular: ' est choisissable',
                        plurial: 's sont choisissables'
                    })}`,
                    inline: false
                });
        const builder = (await interaction
            .reply({
                embeds: [embed()],
                components: components(),
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;

        if (!builder) return log4js.trace('No message to build a poll');

        const collector = builder.createMessageComponentCollector({
            time: 300000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (ctx) => {
            if (ctx.user.id != interaction.user.id) {
                ctx.reply(waitForReplies(interaction.client).everyone).catch(log4js.trace);
                return;
            }

            if (ctx.customId === ButtonIds.PollCancel) {
                const confirmation = await confirm({
                    interaction: ctx,
                    time: 60000,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Annulation')
                        .setDescription(`Êtes-vous sûr d'annuler ?`),
                    user: interaction.user
                }).catch(log4js.trace);

                if (!confirmation || confirmation == 'cancel' || !confirmation.value) {
                    ctx.deleteReply().catch(log4js.trace);
                    builder.edit({ embeds: [replies.cancel()], components: [] }).catch(log4js.trace);
                    return;
                }

                ctx.deleteReply().catch(log4js.trace);
                collector.stop('ended');
            }
            if (ctx.customId == ButtonIds.PollAddChoice) {
                const modal = new ModalBuilder()
                    .setTitle("Ajout d'option")
                    .setCustomId('poll-add-choice')
                    .setComponents(
                        row(
                            new TextInputBuilder()
                                .setCustomId('choice')
                                .setLabel('Option')
                                .setPlaceholder("Nom de l'option")
                                .setMaxLength(100)
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        )
                    );
                await ctx.showModal(modal).catch(log4js.trace);
                const modalReply = await ctx
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(log4js.trace);
                if (!modalReply) return;

                const choice = modalReply.fields.getTextInputValue('choice');
                if (choices.includes(choice)) {
                    modalReply
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Choix déjà existant')
                                    .setDescription(`Ce choix est déjà dans la liste`)
                            ],
                            ephemeral: true
                        })
                        .catch(log4js.trace);
                    return;
                }

                modalReply.deferUpdate().catch(log4js.trace);
                choices.push(choice);
                builder
                    .edit({
                        embeds: [embed()],
                        components: components()
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.PollRemoveChoice) {
                await builder
                    .edit({
                        components: components(true)
                    })
                    .catch(log4js.trace);

                const selector = new StringSelectMenuBuilder()
                    .setCustomId('poll-remove-option')
                    .setOptions(
                        choices.map((x, i) => ({ label: `Option n°${i + 1}`, description: x, value: i.toString() }))
                    );

                const rep = (await ctx
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { questionMark: true })
                                .setTitle('Suppression')
                                .setDescription(`Quelle option voulez-vous supprimer ?`)
                        ],
                        components: [row(selector)],
                        fetchReply: true
                    })
                    .catch(log4js.trace)) as Message<true>;
                if (!rep) return log4js.trace('No message to delete a poll choice');

                const selection = await waitForInteraction({
                    componentType: ComponentType.StringSelect,
                    user: interaction.user,
                    replies: waitForReplies(interaction.client),
                    message: rep
                }).catch(log4js.trace);

                if (!selection) {
                    ctx.deleteReply().catch(log4js.trace);
                    builder
                        .edit({
                            components: components()
                        })
                        .catch(log4js.trace);
                    return;
                }

                const index = parseInt(selection.values[0]);
                choices.splice(index, 1);

                ctx.deleteReply().catch(log4js.trace);
                builder.edit({ components: components(), embeds: [embed()] }).catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.PollValidate) {
                collector.stop('validate');
                await builder.edit({ embeds: [replies.wait(interaction.user)], components: [] }).catch(log4js.trace);

                const creation = await interaction.client.pollsManager.create({
                    question: options.getString('question'),
                    by: interaction.user,
                    choices: choices,
                    time,
                    channel,
                    choosable
                });

                if (creation === 'invalid insertion' || creation === 'message not sent') {
                    builder
                        .edit({
                            embeds: [replies.internalError((interaction.member as GuildMember) ?? interaction.user)]
                        })
                        .catch(log4js.trace);
                    return;
                }

                builder
                    .edit({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Sondage lancé')
                                .setDescription(`Le sondage a été lancé dans ${pingChan(channel)}`)
                        ]
                    })
                    .catch(log4js.trace);
            }
            if (ctx.customId === ButtonIds.PollChoices) {
                const max = choices.length - 1;
                await ctx
                    .showModal(
                        new ModalBuilder()
                            .setTitle('Options')
                            .setCustomId('poll-options-choosable')
                            .setComponents(
                                row(
                                    new TextInputBuilder()
                                        .setLabel("Nombre d'options choisissables")
                                        .setMaxLength(max.toString().length)
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                        .setPlaceholder(`Nombre entre 1 et ${max}`)
                                        .setCustomId('value')
                                )
                            )
                    )
                    .catch(log4js.trace);

                const rep = await ctx
                    .awaitModalSubmit({
                        time: 120000
                    })
                    .catch(log4js.trace);

                if (!rep) return;
                let int = parseInt(rep.fields.getTextInputValue('value'));
                if (!int || isNaN(int)) {
                    rep.reply({
                        embeds: [replies.invalidNumber(interaction.member as GuildMember)],
                        ephemeral: true
                    }).catch(log4js.trace);
                    return;
                }
                if (int > max) int = max;

                choosable = int;
                rep.deferUpdate().catch(log4js.trace);

                builder
                    .edit({
                        embeds: [embed()]
                    })
                    .catch(log4js.trace);
            }
        });

        collector.on('stop', (_c, reason) => {
            if (!reason) {
                builder
                    .edit({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
            }
        });
    }

    if (cmd === 'terminer') {
        const pollId = options.getInteger('sondage');
        const poll = interaction.client.pollsManager.getPoll(pollId);

        if (!poll)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Sondage inconnu')
                            .setDescription(`Il semble que ce sondage n'existe pas`)
                    ]
                })
                .catch(log4js.trace);
        if (poll.ended)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Sondage terminé')
                            .setDescription(`Ce sondage est déjà terminé`)
                    ]
                })
                .catch(log4js.trace);
        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            time: 120000,
            embed: basicEmbed(interaction.user)
                .setTitle('Fin')
                .setDescription(`Êtes-vous sûr de terminer [ce sondage](${poll.message.url}) ?`)
        }).catch(log4js.trace);

        if (!confirmation || confirmation == 'cancel' || !confirmation.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);

        await interaction
            .editReply({
                components: [],
                embeds: [replies.wait(interaction.user)]
            })
            .catch(log4js.trace);
        interaction.client.pollsManager.end(poll.data.poll_id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Sondage terminé')
                        .setDescription(`Le [sondage](${poll.message.url}) a été terminé`)
                ]
            })
            .catch(log4js.trace);
    }
});
