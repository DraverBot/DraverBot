import { configsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions, waitForMessage } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    AttachmentBuilder,
    BaseChannel,
    ChannelType,
    GuildMember,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    Role,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { configKeys, configOptionType, configsData, configType } from '../../data/configData';
import replies from '../../data/replies';
import { confirmReturn } from '../../typings/functions';
import {
    basicEmbed,
    buildButton,
    capitalize,
    checkRolePosition,
    confirm,
    evokerColor,
    notNull,
    numerize,
    pingChan,
    pingRole,
    plurial,
    row,
    subcmd
} from '../../utils/toolbox';
import { variableName, variablesData, variablesGroupNames } from '../../data/vars';
import GetImage from '../../process/GetImage';

export default new DraverCommand({
    name: 'configurer',
    module: 'config',
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
        },
        {
            name: 'variables',
            description: 'Affiche les variables de configuration',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'variable',
                    description: 'Liste de variables que vous voulez voir',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'variables') {
        const group = options.getString('variable');
        if (group) {
            const variables = variablesData[group as variableName];

            const embed = basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Variables de configuration')
                .setDescription(
                    `Utilisez la liste de variables ci-dessous pour configurer, dans les messages du bot, des variables qui seront remplacées\n\n${variables
                        .map((x) => `\`{${x.x}}\` : ${x.name}`)
                        .join('\n')}`
                );
            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
            return;
        }

        interaction.reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Liste des groupes')
                    .setDescription(
                        `IL y a ${numerize(variablesGroupNames.length)} groupe${plurial(
                            variablesGroupNames.length
                        )} de variables configurable${plurial(variablesGroupNames.length)} :\n${variablesGroupNames
                            .map((x) => capitalize(x.name))
                            .join('\n')}`
                    )
            ]
        });
    }
    if (subcommand === 'paramètre') {
        const parameter = configsData[options.getString('paramètre') as keyof configKeys] as configType;

        let value: string | number | boolean | Buffer = '';

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
                        embeds: [replies.cancel(interaction)],
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
                        embeds: [replies.cancel(interaction)]
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

            configsManager.setValue(
                interaction.guild.id,
                parameter.value,
                typeof value === 'boolean' ? value : value.toString()
            );
            reply
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
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
            (await interaction
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
                        embeds: [replies.cancel(interaction)]
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
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});

            value = channel.id;
        } else if (parameter.type === 'role') {
            (await interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Rôle')
                            .setDescription(
                                `Vous êtes en train de configurer le paramètre **${parameter.name}**.\nQuel est le rôle que vous souhaiter assigner à ce paramètre ?\n\n> Répondez par un nom, un identifiant ou une mention\n> Répondez par \`cancel\` pour annuler`
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
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(() => {});

            const role = (reply.mentions.roles?.first() ??
                interaction.guild.roles.cache.get(reply.content.split(' ')[0]) ??
                interaction.guild.roles.cache.find((x) =>
                    x.name.toLowerCase().includes(reply.content.toLowerCase())
                )) as Role;

            reply.delete().catch(() => {});

            if (!role)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Rôle invalide')
                                .setDescription(
                                    `Aucun rôle n'a été trouvé, réessayez avec un identifiant, un nom ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});
            if (
                !checkRolePosition({
                    respond: true,
                    interaction,
                    ephemeral: false,
                    role,
                    member: interaction.member as GuildMember
                })
            )
                return;

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('Confirmation')
                    .setDescription(
                        `Vous allez configurer le paramètre **${parameter.name}** sur le rôle ${pingRole(role)}`
                    )
            }).catch(() => {})) as confirmReturn;

            if (confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});

            value = role.id;
        } else if (parameter.type === 'image') {
            const image = await GetImage.process({
                user: interaction.user,
                interaction,
                embed: basicEmbed(interaction.user, { questionMark: true })
                    .setTitle(`Image`)
                    .setDescription(
                        `Vous configurez **${parameter.name}**.\nEnvoyez une image dans le salon, dont les dimensions sont, au maximum, **1100 par 700 pixels**, et elle ne doit pas dépasser 1Mo\n\n> Vous avez deux minutes\n> Répondez par \`cancel\` pour annuler`
                    )
            }).catch(log4js.trace);

            if (!image || image === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)]
                    })
                    .catch(log4js.trace);

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('Confirmation')
                    .setDescription(`Vous allez configurer le paramètre **${parameter.name}** sur cette image`)
                    .setImage(image.url)
            }).catch(() => {})) as confirmReturn;

            if (confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(() => {});

            value = image.buffer;
        } else {
            throw new Error('Unhandled class: ' + parameter.type);
        }

        configsManager.setValue(
            interaction.guild.id,
            parameter.value,
            typeof ['boolean', 'image'].includes(parameter.type) ? value : value.toString()
        );
        const attachments = [parameter.type === 'image' ? new AttachmentBuilder(value as Buffer) : null].filter(
            notNull
        );

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Paramètre configuré')
                        .setDescription(
                            `Le paramètre **${parameter.name}** a été configuré sur ${
                                parameter.type === 'channel'
                                    ? pingChan(value as string)
                                    : parameter.type === 'role'
                                    ? pingRole(value as string)
                                    : parameter.type === 'image'
                                    ? 'cette image'
                                    : parameter.type === 'boolean'
                                    ? value
                                        ? 'activé'
                                        : 'désactivé'
                                    : '```' + value + '```'
                            }${
                                parameter.value.includes('radius')
                                    ? `\n⚠️\n> Si le rayon que vous avez définit est trop grand, l'image ne sera pas envoyée`
                                    : ''
                            }`
                        )
                ],
                components: [],
                files: attachments
            })
            .catch(() => {});
    }
    if (subcommand === 'liste') {
        const parameter = configsData[options.getString('paramètre')] as configType;

        if (parameter) {
            const value = configsManager.getValue(interaction.guild.id, parameter.value);
            if (parameter.type === 'image') {
                if (!value)
                    return interaction
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Image non configurée')
                                    .setDescription(`Ce paramètre n'est pas configuré`)
                            ],
                            ephemeral: true
                        })
                        .catch(log4js.trace);

                return interaction
                    .reply({
                        files: [new AttachmentBuilder(value as Buffer)]
                    })
                    .catch(log4js.trace);
            }
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
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
        const embed = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Configurations')
                .setDescription(`Voici les configurations effectuées`);

        const embeds = [embed()];
        Object.keys(configsData)
            .filter((x: keyof configKeys) => configsData[x].type !== 'image')
            .sort((a: keyof configKeys, b: keyof configKeys) => {
                const mapping: Record<configOptionType, number> = {
                    boolean: 0,
                    channel: 1,
                    role: 1,
                    number: 2,
                    string: -1,
                    image: -2
                };

                return mapping[a] - mapping[b];
            })
            .forEach((key: keyof configKeys, i) => {
                if (i % 19 === 0 && i > 0) embeds.push(embed());
                const parameter = configsData[key] as configType;
                const value = configsManager.getValue(interaction.guild.id, key);

                embeds[embeds.length - 1].addFields([
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
                    embed().addFields({
                        name: '\u200b',
                        value: '\u200b',
                        inline: false
                    });
                }
            });

        interaction
            .reply({
                embeds
            })
            .catch(() => {});
    }
});
