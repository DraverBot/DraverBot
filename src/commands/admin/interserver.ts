import { interserver } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions, waitForInteraction } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { frequenceBtn, yesNoRow } from '../../data/buttons';
import replies from '../../data/replies';
import { WordGenerator } from '../../managers/Generator';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { interserver as interserverType } from '../../typings/managers';
import { confirmReturn } from '../../typings/functions';
import {
    basicEmbed,
    confirm,
    evokerColor,
    mapEmbedsPaginator,
    numerize,
    pagination,
    pingChan,
    plurial,
    random,
    row,
    sendError,
    subcmd,
    waitForReplies
} from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.interserver'),
    module: 'interchat',
    options: [
        {
            ...translator.commandData('commands.admins.interserver.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.interserver.options.create.options.channel'),
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.interserver.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.interserver.options.delete.options.channel'),
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.interserver.options.display'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.interserver.options.display.options.channel'),
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.interserver.options.edit'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.interserver.options.edit.options.channel'),
                    channelTypes: [ChannelType.GuildText],
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                },
                {
                    ...translator.commandData('commands.admins.interserver.options.edit.options.frequence'),
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    maxLength: 20,
                    minLength: 1
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator']
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'créer') {
        const channel = options.getChannel('salon') as TextChannel;

        const msg = (await interaction
            .reply({
                components: [yesNoRow(interaction)],
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(translator.translate('commands.admins.interserver.replies.create.frequence.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.interserver.replies.create.frequence.description', interaction)
                        )
                        .setColor('Grey')
                ],
                fetchReply: true
            })
            .catch(() => {})) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: msg,
            replies: waitForReplies(interaction.client, interaction)
        }).catch(() => {});

        if (!reply)
            return interaction.editReply({
                components: [],
                embeds: [replies.cancel(interaction)]
            });

        let frequence = undefined;
        if (reply.customId === 'yes') {
            const modal = new ModalBuilder()
                .setCustomId('frequencemodal')
                .setTitle(translator.translate('commands.admins.interserver.replies.create.modal.title', interaction))
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setCustomId('frequence-field')
                            .setLabel(translator.translate('commands.admins.interserver.replies.create.modal.label', interaction))
                            .setMaxLength(255)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(
                                new WordGenerator({
                                    capitals: true,
                                    letters: true,
                                    numbers: true,
                                    special: true,
                                    length: random({ max: 20, min: 16 })
                                }).generate()
                            )
                    )
                );
            await reply.showModal(modal);
            const modalResult = (await reply
                .awaitModalSubmit({
                    time: 120000
                })
                .catch(() => {})) as ModalSubmitInteraction;

            if (!modalResult)
                interaction.editReply({
                    components: [],
                    embeds: [replies.cancel(reply)]
                });

            frequence = modalResult.fields.getTextInputValue('frequence-field');
            modalResult.deferUpdate();
        } else {
            await reply.deferUpdate().catch(sendError);
        }

        interaction
            .editReply({
                components: [],
                embeds: [replies.wait(interaction.user, interaction)]
            })
            .catch(() => {});
        const res = await interserver.createInterserver({
            channel: channel,
            frequence,
            guild_id: interaction.guild.id
        });

        if (typeof res === 'string') {
            const rep = (replies[res] as (user: GuildMember, metadata: any) => EmbedBuilder)(
                interaction.member as GuildMember,
                { frequence, channel_id: channel.id, channel, lang: interaction }
            );
            return interaction
                .editReply({
                    embeds: [rep]
                })
                .catch(() => {});
        }

        interaction.editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.admins.interserver.replies.create.created.title', interaction))
                    .setDescription(translator.translate('commands.admins.interserver.replies.create.created.description', interaction, { channel: pingChan(channel) }))
            ],
            components: [row(frequenceBtn(interaction))]
        });
    }
    if (subcommand === 'supprimer') {
        const channel = options.getChannel('salon') as TextChannel;

        if (!interserver.cache.find((x) => x.guild_id === interaction.guild.id && x.channel_id === channel.id))
            return interaction
                .reply({
                    embeds: [replies.interserverNotChannel(interaction.user, { channel, lang: interaction })]
                })
                .catch(() => {});

        const validated = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.interserver.replies.delete.confirm.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.interserver.replies.delete.confirm.description', interaction, { channel: pingChan(channel) })
                )
        }).catch(() => {})) as confirmReturn;

        if (validated === 'cancel' || !validated?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        await interaction.editReply({
            embeds: [replies.wait(interaction.user, validated.interaction)],
            components: []
        });

        await interserver
            .removeInterserver({
                guild_id: interaction.guild.id,
                channel
            })
            .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.interserver.replies.delete.deleted.title', interaction))
                        .setDescription(translator.translate('commands.admins.interserver.replies.delete.deleted.description', interaction, { channel: pingChan(channel) }))
                ]
            })
            .catch(() => {});
    }
    if (subcommand === 'afficher') {
        const list = interserver.cache.filter((x) => x.guild_id === interaction.guild.id).toJSON();
        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setDescription(translator.translate('commands.admins.interserver.replies.display.none.description', interaction))
                            .setTitle(translator.translate('commands.admins.interserver.replies.display.none.title', interaction))
                    ]
                })
                .catch(() => {});

        const channel = options.getChannel('salon', false) as TextChannel;
        if (channel) {
            const data = list.find((x) => x.channel_id === channel.id) as interserverType;
            if (!data)
                return interaction
                    .reply({
                        embeds: [
                            replies.interserverNotChannel(interaction.member as GuildMember, {
                                channel,
                                lang: interaction
                            })
                        ]
                    })
                    .catch(() => {});

            const shared = interserver.cache
                .filter((x) => x.frequence === data.frequence)
                .toJSON() as interserverType[];

            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.interserver.replies.display.info.title', interaction))
                            .setDescription(
                                translator.translate(`commands.admins.interserver.replies.display.info.${shared.length === 1 ? 'alone' : 'shared'}`, interaction, {
                                    channel: pingChan(channel),
                                    shared: shared.length
                                })
                            )
                    ],
                    components: [row(frequenceBtn(interaction))]
                })
                .catch(() => {});
        }

        const map = (embed: EmbedBuilder, data: interserverType) => {
            const index = list.indexOf(data);
            return embed.addFields({
                name: translator.translate('commands.admins.interserver.replies.display.list.mapper', interaction, {
                    index: index + 1
                }),
                value: pingChan(data.channel_id),
                inline: false
            });
        };

        const basic = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.interserver.replies.display.list.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.interserver.replies.list.description', interaction, {
                        count: list.length
                    })
                );

        if (list.length <= 5) {
            const embed = basic();

            for (const d of list) {
                map(embed, d);
            }

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const array = [basic()];

            list.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) array.push(basic());

                map(array[array.length - 1], v);
            });

            pagination({
                interaction,
                embeds: mapEmbedsPaginator(array),
                user: interaction.user,
                time: 180000
            });
        }
    }
    if (subcommand === 'modifier') {
        const channel = options.getChannel('salon') as TextChannel;
        const frequence =
            options.getString('fréquence') ??
            new WordGenerator({
                letters: true,
                capitals: true,
                numbers: true,
                special: true,
                length: 18
            }).generate();

        if (!interserver.cache.find((x) => x.channel_id === channel.id && x.guild_id === interaction.guild.id))
            return interaction
                .reply({
                    embeds: [
                        replies.interserverNotChannel(interaction.member as GuildMember, { channel, lang: interaction })
                    ]
                })
                .catch(() => {});

        await interaction.deferReply().catch(log4js.trace);
        const res = await interserver
            .editFrequence({
                guild_id: interaction.guild.id,
                channel_id: channel.id,
                frequence
            })
            .catch(() => {});
        if (res === 'interserverFrequenceAssigned')
            return interaction.editReply({
                embeds: [
                    replies.interserverFrequenceAssigned(interaction.member as GuildMember, {
                        frequence,
                        lang: interaction
                    })
                ]
            });

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.interserver.replies.edit.title', interaction))
                        .setDescription(translator.translate('commands.admins.interserver.replies.edit.description', interaction, { channel: pingChan(channel) }))
                ],
                components: [row(frequenceBtn(interaction))]
            })
            .catch(() => {});
    }
});
