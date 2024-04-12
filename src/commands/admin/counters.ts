import { log4js, preconditions, waitForInteraction } from 'amethystjs';
import { DraverCommand } from '../../structures/DraverCommand';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message, StringSelectMenuBuilder } from 'discord.js';
import { countersManager } from '../../cache/managers';
import { basicEmbed, buildButton, capitalize, plurial, row, systemReply, waitForReplies } from '../../utils/toolbox';
import GetCountersConfig from '../../process/GetCountersConfig';
import replies from '../../data/replies';
import { ButtonIds } from '../../typings/buttons';
import { CounterId } from '../../typings/database';
import GetCountersNames from '../../process/GetCountersNames';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.counters'),
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    module: 'counters',
    options: [
        {
            ...translator.commandData('commands.admins.counters.options.enable'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.counters.options.edit'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.counters.options.disable'),
            type: ApplicationCommandOptionType.Subcommand
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'activer') {
        if (!!countersManager.getCounter(interaction.guild.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.counters.replies.enable.enabled.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.counters.replies.enable.enabled.description', interaction)
                            )
                    ]
                })
                .catch(log4js.trace);

        const config = await GetCountersConfig.process({
            user: interaction.user,
            interaction
        });
        if (config === 'canceled') return;

        if (!!countersManager.getCounter(interaction.guild.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.counters.replies.enable.edited.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.counters.replies.enable.edited.description', interaction)
                            )
                    ]
                })
                .catch(log4js.trace);

        countersManager.create({
            guild: interaction.guild,
            category: config.category,
            channelType: config.type,
            channels: config.names.map((x, i) => ({ id: config.selected[i], name: x }))
        });

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.counters.replies.enable.configured.title', interaction))
                        .setDescription(translator.translate('commands.admins.counters.replies.enable.configured.description', interaction))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'modifier') {
        if (!countersManager.getCounter(interaction.guild.id))
            return interaction
                .reply({
                    embeds: [replies.noCounter(interaction.member as GuildMember, interaction)]
                })
                .catch(log4js.trace);

        const rep = (await interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { questionMark: true })
                        .setTitle(translator.translate('commands.admins.counters.replies.edit.question.title', interaction))
                        .setDescription(translator.translate('commands.admins.counters.replies.edit.question.description', interaction))
                ],
                fetchReply: true,
                components: [
                    row(
                        buildButton({
                            label: translator.translate('commands.admins.counters.buttons.edit', interaction),
                            style: 'Primary',
                            buttonId: 'EditActiveCounters'
                        }),
                        buildButton({
                            label: translator.translate('commands.admins.counters.buttons.rename', interaction),
                            style: 'Secondary',
                            buttonId: 'EditCounterNames'
                        })
                    )
                ]
            })
            .catch(log4js.trace)) as Message<true>;
        if (!rep)
            return systemReply(interaction, {
                embeds: [replies.internalError(interaction.member as GuildMember, interaction)]
            }).catch(log4js.trace);

        const act = await waitForInteraction({
            componentType: ComponentType.Button,
            message: rep,
            user: interaction.user,
            replies: waitForReplies(interaction.client, interaction),
            time: 120000
        }).catch(log4js.trace);

        if (!act)
            return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
        const counter = countersManager.getCounter(interaction.guild.id);
        if (!counter)
            return interaction
                .editReply({
                    embeds: [replies.noCounter(interaction.member as GuildMember, interaction)]
                })
                .catch(log4js.trace);

        if (act.customId === ButtonIds.EditActiveCounters) {
            act.deferUpdate().catch(log4js.trace);

            const selector = new StringSelectMenuBuilder()
                .setMaxValues(countersManager.data(interaction, false).length)
                .setCustomId(ButtonIds.EditActiveCountersModal)
                .setOptions(
                    countersManager.data(interaction).map((x) => {
                        const info = counter.channels.find((y) => y.id === x.id);

                        return {
                            label: capitalize(x.name),
                            description: x.description,
                            default: info?.enabled ?? false,
                            value: x.id.toString()
                        };
                    })
                )
                .setMinValues(1);

            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle(translator.translate('commands.admins.counters.replies.edit.choice.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.counters.replies.edit.choice.description', interaction)
                            )
                    ],
                    components: [row(selector)]
                })
                .catch(log4js.trace);
            const selection = await waitForInteraction({
                componentType: ComponentType.StringSelect,
                user: interaction.user,
                replies: waitForReplies(interaction.client, act),
                time: 120000,
                message: rep
            }).catch(log4js.trace);
            if (!selection)
                return interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
            if (!countersManager.getCounter(interaction.guild.id))
                return interaction
                    .editReply({
                        embeds: [replies.noCounter(interaction.member as GuildMember, interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
            const ids = selection.values.map((x) => parseInt(x)) as CounterId[];

            counter.bulk();
            counter.channels.forEach((x) => {
                counter.disable(x.id, x.channel?.id);
            });
            ids.forEach((x) => {
                counter.enable(x, null);
            });
            counter.bulkUpdate();

            await interaction
                .editReply({
                    embeds: [replies.wait(interaction.user, selection)],
                    components: []
                })
                .catch(log4js.trace);

            await counter.setup().catch(log4js.trace);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.counters.replies.edit.edited.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.counters.replies.edit.edited.description', interaction, {
                                    count: ids.length
                                })
                            )
                    ]
                })
                .catch(log4js.trace);
        }
        if (act.customId === ButtonIds.EditCounterNames) {
            act.deferUpdate().catch(log4js.trace);

            if (!counter.channels.filter((x) => x.enabled).length)
                return interaction
                    .editReply({
                        components: [],
                        embeds: [replies.noCounter(interaction.member as GuildMember, interaction)]
                    })
                    .catch(log4js.trace);
            const names = await GetCountersNames.process({
                user: interaction.user,
                interaction,
                counter,
                message: rep
            });

            if (names === 'canceled') return;

            counter.bulk();
            names.forEach(({ name, id }) => {
                counter.setName(id, name);
            });
            counter.bulkUpdate();

            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.counters.replies.edit.renamed.title', interaction))
                            .setDescription(translator.translate('commands.admins.counters.replies.edit.renamed.description', interaction))
                    ]
                })
                .catch(log4js.trace);
        }
    }
    if (cmd === 'désactiver') {
        const counter = countersManager.getCounter(interaction.guild.id);
        if (!counter || !counter.channels.filter((x) => x.enabled).length)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(translator.translate('commands.admins.counters.replies.disable.disabled.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.counters.replies.disable.disabled.description', interaction)
                            )
                    ]
                })
                .catch(log4js.trace);

        counter.bulk();
        counter.channels.forEach((x) => {
            counter.disable(x.id, x.channel?.id);
        });
        counter.bulkUpdate();

        counter.setup().catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.counters.replies.disable.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.counters.replies.disable.done.description', interaction))
                ]
            })
            .catch(log4js.trace);
    }
});
