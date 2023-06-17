import { AmethystCommand, log4js, preconditions, waitForInteraction } from 'amethystjs';
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
import { basicEmbed, buildButton, confirm, pingChan, row, waitForReplies } from '../utils/toolbox';
import { cancelButton } from '../data/buttons';
import { ButtonIds } from '../typings/buttons';
import replies from '../data/replies';
import time from '../preconditions/time';
import ms from 'ms';

export default new AmethystCommand({
    name: 'sondage',
    description: 'Lance un sondage sur le serveur',
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
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled, time],
    permissions: ['ManageGuild']
}).setChatInputRun(async ({ interaction, options }) => {
    const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;

    const choices: string[] = [];
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
            );
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
                embed: basicEmbed(interaction.user).setTitle('Annulation').setDescription(`Êtes-vous sûr d'annuler ?`),
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
                channel
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
});
