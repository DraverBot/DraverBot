import { AmethystCommand, preconditions, waitForMessage } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    BaseChannel,
    ChannelType,
    GuildMember,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { configKeys, configOptionType, configsData, configType } from '../data/configData';
import replies from '../data/replies';
import { confirmReturn } from '../typings/functions';
import {
    basicEmbed,
    buildButton,
    capitalize,
    confirm,
    evokerColor,
    notNull,
    numerize,
    pingChan,
    row,
    subcmd
} from '../utils/toolbox';

export default new AmethystCommand({
    name: 'configurer',
    description: 'Configure un paramètre de Draver',
    preconditions: [preconditions.GuildOnly],
    permissions: ['Administrator'],
    options: [
        {
            name: 'paramètre',
            description: 'Configure un paramètre du serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'paramètre',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    description: 'Paramètre à configurer',
                    autocomplete: true
                }
            ]
        },
        {
            name: 'liste',
            description: 'Affiche la liste des paramètres',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'paramètre',
                    description: 'Paramètre que vous voulez voir',
                    required: false,
                    autocomplete: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'paramètre') {
        const parameter = configsData[options.getString('paramètre') as keyof configKeys] as configType;

        let value: string | number | boolean = '';

        if (parameter.type === 'boolean') {
            const reply = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('État')
                    .setDescription(
                        `Vous allez configurer le paramètre **${parameter.name}**.\nVoulez-vous l'activer ou le désactiver ?`
                    ),
                components: [
                    row(
                        buildButton({
                            label: 'Activer',
                            style: 'Success',
                            id: 'yes'
                        }),
                        buildButton({
                            label: 'Désactiver',
                            style: 'Danger',
                            id: 'no'
                        })
                    )
                ]
            }).catch(() => {})) as confirmReturn;

            if (reply === 'cancel' || reply?.value === undefined)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(() => {});

            value = reply.value;
        } else if (parameter.type === 'string' || parameter.type === 'number') {
            const modal = new ModalBuilder()
                .setTitle('Configuration')
                .setCustomId('config-modal')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel(`Valeur`)
                            .setPlaceholder(
                                `Entrez ici la valeur de ${parameter.name} ( ${
                                    parameter.type === 'number' ? 'nombre' : 'texte'
                                } )`
                            )
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setCustomId('value')
                    )
                );
            await interaction.showModal(modal);
            const reply = (await interaction
                .awaitModalSubmit({
                    time: 300000
                })
                .catch(() => {})) as ModalSubmitInteraction;

            if (!reply)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            if (parameter.type === 'number') {
                const test = parseInt(reply.fields.getTextInputValue('value') ?? '');
                if (isNaN(test) || test < 0)
                    return interaction
                        .editReply({
                            embeds: [replies.invalidNumber(interaction.member as GuildMember)]
                        })
                        .catch(() => {});

                value = test;
            } else {
                value = reply.fields.getTextInputValue('value');
            }

            interaction.client.configsManager.setValue(
                interaction.guild.id,
                parameter.value,
                typeof value === 'boolean' ? value : value.toString()
            );
            reply
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { defaultColor: true })
                            .setTitle('Paramètre configuré')
                            .setDescription(
                                `Le paramètre **${parameter.name}** a été configuré sur \`\`\`${value}\`\`\``
                            )
                    ],
                    components: []
                })
                .catch(() => {});
            return;
        } else if (parameter.type === 'channel') {
            const msg = (await interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon')
                            .setDescription(
                                `Vous êtes en train de configurer le paramètre **${parameter.name}**.\nQuel est le salon que vous souhaiter assigner à ce paramètre ?\n\n> Répondez par un nom, un identifiant ou une mention\n> Répondez par \`cancel\` pour annuler`
                            )
                            .setColor('Grey')
                    ],
                    fetchReply: true
                })
                .catch(() => {})) as Message<true>;

            const reply = await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {});

            if (!reply || reply.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            const channel = (reply.mentions.channels.first() ??
                interaction.guild.channels.cache.get(reply.content.split(' ')[0]) ??
                interaction.guild.channels.cache.find((x) =>
                    x.name.toLowerCase().includes(reply.content.toLowerCase())
                )) as BaseChannel;

            reply.delete().catch(() => {});

            if (!channel)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Salon invalide')
                                .setDescription(
                                    `Aucun salon n'a été trouvé, réessayez avec un identifiant, un nom ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});
            if (channel.type !== ChannelType.GuildText)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Salon invalide')
                                .setDescription(
                                    `Le salon ${pingChan(channel)} n'est pas un salon textuel.\nOr, le paramètre **${
                                        parameter.name
                                    }** n'est configurable que sur un salon textuel`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('Confirmation')
                    .setDescription(
                        `Vous allez configurer le paramètre **${parameter.name}** sur le salon ${pingChan(channel)}`
                    )
            }).catch(() => {})) as confirmReturn;

            if (confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(() => {});

            value = channel.id;
        } else {
            throw new Error('Unhandled class: ' + parameter.type);
        }

        interaction.client.configsManager.setValue(
            interaction.guild.id,
            parameter.value,
            typeof value === 'boolean' ? value : value.toString()
        );
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle('Paramètre configuré')
                        .setDescription(
                            `Le paramètre **${parameter.name}** a été configuré sur ${
                                parameter.type === 'channel'
                                    ? pingChan(value as string)
                                    : parameter.type === 'boolean'
                                    ? value
                                        ? 'activé'
                                        : 'désactivé'
                                    : '```' + value + '```'
                            }`
                        )
                ],
                components: []
            })
            .catch(() => {});
    }
    if (subcommand === 'liste') {
        const parameter = configsData[options.getString('paramètre')] as configType;

        if (parameter) {
            const value = interaction.client.configsManager.getValue(interaction.guild.id, parameter.value);
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle(`Paramètre ${parameter.name}`)
                        .setDescription(parameter.description)
                        .setFields({
                            name: 'État',
                            value:
                                parameter.type === 'boolean'
                                    ? capitalize(value ? 'activé' : 'désactivé')
                                    : parameter.type === 'channel'
                                    ? pingChan(value as string)
                                    : `\`\`\`${value}\`\`\``,
                            inline: false
                        })
                ]
            });
        }
        const embed = basicEmbed(interaction.user, { defaultColor: true })
            .setTitle('Configurations')
            .setDescription(`Voici les configurations effectuées`);

        Object.keys(configsData)
            .sort((a: keyof configKeys, b: keyof configKeys) => {
                const mapping: Record<configOptionType, number> = {
                    boolean: 0,
                    channel: 1,
                    number: 2,
                    string: -1
                };

                return mapping[a] - mapping[b];
            })
            .forEach((key: keyof configKeys, i) => {
                const parameter = configsData[key] as configType;
                const value = interaction.client.configsManager.getValue(interaction.guild.id, key);

                embed.addFields([
                    {
                        name: capitalize(parameter.name),
                        value:
                            notNull(value) && value !== ''
                                ? parameter.type === 'number'
                                    ? numerize(parseInt(value as string))
                                    : parameter.type === 'boolean'
                                    ? value
                                        ? 'activé'
                                        : 'désactivé'
                                    : parameter.type === 'channel'
                                    ? pingChan(value as string)
                                    : `\`\`\`${value}\`\`\``
                                : 'N/A',
                        inline: parameter.type === 'string' ? false : true
                    }
                ]);
                if (i % 4 === 0 && i > 0 && parameter.type !== 'string') {
                    embed.addFields({
                        name: '\u200b',
                        value: '\u200b',
                        inline: false
                    });
                }
            });

        interaction
            .reply({
                embeds: [embed]
            })
            .catch(() => {});
    }
});
