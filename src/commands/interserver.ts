import { AmethystCommand, preconditions, waitForInteraction } from 'amethystjs';
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
import { frequenceBtn, yesNoRow } from '../data/buttons';
import replies from '../data/replies';
import { WordGenerator } from '../managers/Generator';
import moduleEnabled from '../preconditions/moduleEnabled';
import { interserver } from '../typings/database';
import { confirmReturn } from '../typings/functions';
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
    subcmd
} from '../utils/toolbox';

export default new AmethystCommand({
    name: 'interserver',
    description: "Gère le système d'interserveur sur le serveur",
    options: [
        {
            name: 'créer',
            description: "Créer un salon d'interserveur sur le serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à configurer',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: 'supprimer',
            description: "Supprime un salon d'interchat dans le serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à déconfigurer',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: 'afficher',
            description: 'Affiche la liste des interchats du serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon spécifique que vous voulez voir',
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: "modifier",
            description: "Modifie la fréquence d'un salon d'interchat",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "salon",
                    description: "Salon à re-configurer",
                    channelTypes: [ChannelType.GuildText],
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                },
                {
                    name: 'fréquence',
                    description: "Fréquence surlaquelle vous voulez changer",
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
                components: [yesNoRow()],
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Fréquence optionnelle')
                        .setDescription(
                            `Voulez-vous ajouter une fréquence à votre salon d'interchat ?\nSi vous ne voulez pas, une fréquence sera générée aléatoirement`
                        )
                        .setColor('Grey')
                ],
                fetchReply: true
            })
            .catch(() => {})) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: msg
        }).catch(() => {});

        if (!reply)
            return interaction.editReply({
                components: [],
                embeds: [replies.cancel()]
            });

        let frequence = undefined;
        if (reply.customId === 'yes') {
            const modal = new ModalBuilder()
                .setCustomId('frequencemodal')
                .setTitle('Fréquence')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setCustomId('frequence-field')
                            .setLabel('Fréquence souhaitée')
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
                    embeds: [replies.cancel()]
                });

            frequence = modalResult.fields.getTextInputValue('frequence-field');
            modalResult.deferUpdate();
        }

        interaction
            .editReply({
                components: [],
                embeds: [replies.wait(interaction.user)]
            })
            .catch(() => {});
        const res = await interaction.client.interserver.createInterserver({
            channel: channel,
            frequence,
            guild_id: interaction.guild.id
        });

        if (typeof res === 'string') {
            const rep = (replies[res] as (user: GuildMember, metadata: any) => EmbedBuilder)(
                interaction.member as GuildMember,
                { frequence, channel_id: channel.id, channel }
            );
            return interaction
                .editReply({
                    embeds: [rep]
                })
                .catch(() => {});
        }

        interaction.editReply({
            embeds: [
                basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle('Interchat crée')
                    .setDescription(`Un salon d'interchat à bien été crée dans le salon ${pingChan(channel)}`)
            ],
            components: [row(frequenceBtn())]
        });
    }
    if (subcommand === 'supprimer') {
        const channel = options.getChannel('salon') as TextChannel;

        if (
            !interaction.client.interserver.cache.find(
                (x) => x.guild_id === interaction.guild.id && x.channel_id === channel.id
            )
        )
            return interaction
                .reply({
                    embeds: [replies.interserverNotChannel(interaction.user, { channel })]
                })
                .catch(() => {});

        const validated = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle("Suppression d'interchat")
                .setDescription(
                    `Voulez-vous vraiment supprimer l'interchat du salon ${pingChan(
                        channel
                    )}\n> Le salon ne sera pas supprimé`
                )
        }).catch(() => {})) as confirmReturn;

        if (validated === 'cancel' || !validated?.value)
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

        await interaction.client.interserver
            .removeInterserver({
                guild_id: interaction.guild.id,
                channel
            })
            .catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle('Interchat supprimé')
                        .setDescription(`L'interchat du salon ${pingChan(channel)} a été supprimé`)
                ]
            })
            .catch(() => {});
    }
    if (subcommand === 'afficher') {
        const list = interaction.client.interserver.cache.filter((x) => x.guild_id === interaction.guild.id).toJSON();
        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setDescription(`Aucun salon d'interchat n'est configuré sur votre serveur`)
                            .setTitle("Pas d'interchat")
                    ]
                })
                .catch(() => {});

        const channel = options.getChannel('salon', false) as TextChannel;
        if (channel) {
            const data = list.find((x) => x.channel_id === channel.id) as interserver;
            if (!data)
                return interaction
                    .reply({
                        embeds: [replies.interserverNotChannel(interaction.member as GuildMember, { channel })]
                    })
                    .catch(() => {});

            const shared = interaction.client.interserver.cache
                .filter((x) => x.frequence === data.frequence)
                .toJSON() as interserver[];

            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { defaultColor: true })
                            .setTitle('Interchat')
                            .setDescription(
                                `Le salon ${pingChan(channel)} partage sa fréquence avec ${
                                    shared.length === 1
                                        ? "aucun autre salon d'interchat"
                                        : `**${numerize(shared.length - 1)}** autre${
                                              shared.length > 2 ? 's salons' : ' salon'
                                          } d'interchat`
                                }`
                            )
                    ],
                    components: [row(frequenceBtn())]
                })
                .catch(() => {});
        }

        const map = (embed: EmbedBuilder, data: interserver) => {
            const index = list.indexOf(data);
            return embed.addFields({
                name: `Salon numéro ${numerize(index + 1)}`,
                value: `${pingChan(data.channel_id)}`,
                inline: false
            });
        };

        const basic = () =>
            basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Salons d'interchat")
                .setDescription(
                    `Il y a ${list.length} salon${plurial(list.length, {})} configuré${plurial(
                        list.length,
                        {}
                    )} sur le serveur`
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

                map(array[i % 5], v);
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
        const frequence = options.getString('fréquence') ?? new WordGenerator({
            letters: true,
            capitals: true,
            numbers: true,
            special: true,
            length: 18
        }).generate();

        if (!interaction.client.interserver.cache.find(x => x.channel_id === channel.id && x.guild_id === interaction.guild.id)) return interaction.reply({
            embeds: [ replies.interserverNotChannel(interaction.member as GuildMember, { channel }) ]
        }).catch(() => {});

        await interaction.deferReply();
        const res = await interaction.client.interserver.editFrequence({
            guild_id: interaction.guild.id,
            channel_id: channel.id,
            frequence
        }).catch(() => {});
        if (res === 'interserverFrequenceAssigned') return interaction.editReply({
            embeds: [ replies.interserverFrequenceAssigned(interaction.member as GuildMember, { frequence }) ]
        });

        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Interchat modifié")
                .setDescription(`La fréquence du salon d'interchat ${pingChan(channel)} a été modifiée`)
            ],
            components: [ row(frequenceBtn()) ]
        }).catch(() => {})
    }
});
