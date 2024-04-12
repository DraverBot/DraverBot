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
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.config'),
    module: 'config',
    preconditions: [preconditions.GuildOnly],
    permissions: ['Administrator'],
    options: [
        {
            ...translator.commandData('commands.admins.config.options.setting'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.config.options.setting.options.setting'),
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.config.options.list'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.config.options.list.options.setting'),
                    required: false,
                    autocomplete: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.config.options.variables'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.config.options.variables.options.variable'),
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
                .setTitle(translator.translate('commands.admins.config.replies.variables.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.config.replies.variables.description', interaction, {
                        map: variables
                        .map((x) => `\`{${x.x}}\` : ${translator.translate(`contents.global.variables.variables.${group}.${x.id}`, interaction)}`)
                        .join('\n')
                    })
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
                    .setTitle(translator.translate('commands.admins.config.replies.groups.title', interaction))
                    .setDescription(
                        translator.translate(`commands.admins.config.replies.groups.description`, interaction, {
                            count: variablesGroupNames.length,
                            groups: variablesGroupNames.map(x => capitalize(translator.translate(`contents.global.variables.groups.${x.id}`, interaction))).join('\n')
                        })
                    )
            ]
        });
    }
    if (subcommand === 'paramètre') {
        const parameter = configsData[options.getString('paramètre') as keyof configKeys] as configType;
        const paramName = translator.translate(`contents.global.configs.${parameter.value}`, interaction);

        let value: string | number | boolean | Buffer = '';

        if (parameter.type === 'boolean') {
            const reply = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle(translator.translate('commands.admins.config.replies.configuring.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.config.replies.configuring.description', interaction, {
                            param: paramName
                        })
                    ),
                components: [
                    row(
                        buildButton({
                            label: translator.translate('commands.admins.config.buttons.enable', interaction),
                            style: 'Success',
                            id: 'yes'
                        }),
                        buildButton({
                            label: translator.translate('commands.admins.config.buttons.disable', interaction),
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
                .setTitle(translator.translate('commands.admins.config.modals.config.title', interaction))
                .setCustomId('config-modal')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel(translator.translate('commands.admins.config.modals.config.value.label', interaction))
                            .setPlaceholder(
                                translator.translate('commands.admins.config.modals.config.value.placeholder', interaction, {
                                    param: paramName,
                                    type: translator.translate(`commands.admins.config.types.${parameter.type}`, interaction)
                                })
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
                            embeds: [replies.invalidNumber(interaction.member as GuildMember, reply)]
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
                            .setTitle(translator.translate('commands.admins.config.replies.configured.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.config.replies.configured.description', interaction, {
                                    name: paramName,
                                    value: value
                                })
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
                            .setTitle(translator.translate('commands.admins.config.replies.channel.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.config.replies.channel.description', interaction, {
                                    name: paramName
                                })
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
                            replies.invalidChannel(interaction.member as GuildMember, interaction)
                        ]
                    })
                    .catch(() => {});
            if (channel.type !== ChannelType.GuildText)
                return interaction
                    .editReply({
                        embeds: [
                            replies.invalidChannelType(interaction.member as GuildMember, [ChannelType.GuildText], interaction)
                        ]
                    })
                    .catch(() => {});

            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle(translator.translate('commands.admins.config.replies.channelling.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.config.replies.channelling.description', interaction, {
                            name: paramName,
                            channel: pingChan(channel)
                        })
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
                            .setTitle(translator.translate('commands.admins.config.replies.rolling.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.config.replies.rolling.description', interaction, {
                                    name: paramName
                                })
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
                            replies.noRole(interaction.member as GuildMember, interaction)
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
                    .setTitle(translator.translate('commands.admins.config.replies.roleConfirm.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.config.replies.roleConfirm.decsription', interaction, {
                            name: paramName,
                            role: pingRole(role)
                        })
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
                    .setTitle(translator.translate('commands.admins.config.replies.askImage.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.config.replies.askImage.description', interaction, {
                            name: paramName
                        })
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
                    .setTitle(translator.translate('commands.admins.config.replies.imaging.title', interaction))
                    .setDescription(translator.translate('commands.admins.config.replies.imaging.description', interaction, {
                        name: paramName
                    }))
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
                        .setTitle(translator.translate('commands.admins.config.replies.configured.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.config.replies.configured.final', interaction, {
                                name: paramName,
                                value: parameter.type === 'channel' ? pingChan(value as string) : parameter.type === 'role' ? pingRole(value as string) :
                                parameter.type === 'image' ? 'cette image' : parameter.type === 'boolean' ? translator.translate(`commands.admins.config.replies.configured.booleans.${value ? 'enabled' : 'disabled'}`, interaction) : '```' + value + '```'
                            }) + parameter.value.includes('radius') ? translator.translate('commands.admins.config.replies.configured.radiusAlert', interaction) : ''
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
            const paramName = translator.translate(`contents.global.configs.${parameter.value}`, interaction);

            if (parameter.type === 'image') {
                if (!value)
                    return interaction
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle(translator.translate('commands.admins.config.replies.list.noImage.title', interaction))
                                    .setDescription(translator.translate('commands.admins.config.replies.list.noImage.description', interaction))
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
                        .setTitle(translator.translate('commands.admins.config.replies.list.parameter.title', interaction, { name: paramName }))
                        .setDescription(translator.translate(`contents.global.configs.${parameter.value}.description`, interaction))
                        .setFields({
                            name: translator.translate('commands.admins.config.replies.list.parameter.field.name', interaction),
                            value:
                                parameter.type === 'boolean'
                                    ? capitalize(translator.translate(`commands.admins.config.configured.booleans.${value ? 'enabled' : 'disabled'}`, interaction))
                                    : parameter.type === 'channel'
                                      ? pingChan(value as string)
                                      : parameter.type === 'role' ? pingRole(value as string)
                                      : translator.translate('commands.admins.config.replies.list.parameter.field.value', interaction, { value: value as string }),
                            inline: false
                        })
                ]
            });
        }
        const embed = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.config.replies.list.list.title', interaction))
                .setDescription(translator.translate('commands.admins.config.replies.list.list.description', interaction));

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
                                ? parameter.type === 'boolean'
                                      ? translator.translate(`commands.admins.config.replies.configured.booleans.${value ? 'enabled' : 'disabled'}`, interaction)
                                      : parameter.type === 'channel'
                                        ? pingChan(value as string)
                                        : parameter.type === 'role' ? pingRole(value as string)
                                        : translator.translate('commands.admins.config.replies.list.parameter.field.value', interaction, { value: value as string })
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
