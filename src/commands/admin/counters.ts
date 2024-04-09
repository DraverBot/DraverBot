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

export default new DraverCommand({
    name: 'compteurs',
    description: 'Configure les compteurs du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    module: 'counters',
    options: [
        {
            name: 'activer',
            description: 'Active les compteurs sur le serveur',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'modifier',
            description: 'Modifie les compteurs',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'désactiver',
            description: 'Désactive tous les compteurs',
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
                            .setTitle('Compteurs activés')
                            .setDescription(
                                `Les compteurs sont déjà activés sur ce serveur.\nSi vous voulez modifier les compteurs, utilisez plutôt \`/compteurs modifier\``
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
                            .setTitle('Compteurs activés')
                            .setDescription(
                                `Les compteurs ont activés entre-temps sur ce serveur.\nSi vous voulez modifier les compteurs, utilisez plutôt \`/compteurs liste\``
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
                        .setTitle('Compteurs')
                        .setDescription(`Les compteurs ont été mis en place`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'modifier') {
        if (!countersManager.getCounter(interaction.guild.id))
            return interaction
                .reply({
                    embeds: [replies.noCounter(interaction.member as GuildMember)]
                })
                .catch(log4js.trace);

        const rep = (await interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { questionMark: true })
                        .setTitle('Modification')
                        .setDescription(`Que voulez-vous faire ?`)
                ],
                fetchReply: true,
                components: [
                    row(
                        buildButton({
                            label: 'Modifier les compteurs activés',
                            style: 'Primary',
                            buttonId: 'EditActiveCounters'
                        }),
                        buildButton({
                            label: 'Renommer les compteurs',
                            style: 'Secondary',
                            buttonId: 'EditCounterNames'
                        })
                    )
                ]
            })
            .catch(log4js.trace)) as Message<true>;
        if (!rep)
            return systemReply(interaction, {
                embeds: [replies.internalError(interaction.member as GuildMember)]
            }).catch(log4js.trace);

        const act = await waitForInteraction({
            componentType: ComponentType.Button,
            message: rep,
            user: interaction.user,
            replies: waitForReplies(interaction.client),
            time: 120000
        }).catch(log4js.trace);

        if (!act) return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
        const counter = countersManager.getCounter(interaction.guild.id);
        if (!counter)
            return interaction
                .editReply({
                    embeds: [replies.noCounter(interaction.member as GuildMember)]
                })
                .catch(log4js.trace);

        if (act.customId === ButtonIds.EditActiveCounters) {
            act.deferUpdate().catch(log4js.trace);

            const selector = new StringSelectMenuBuilder()
                .setMaxValues(countersManager.data.length)
                .setCustomId(ButtonIds.EditActiveCountersModal)
                .setOptions(
                    countersManager.data.map((x) => {
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
                            .setTitle('Compteurs')
                            .setDescription(
                                `Choisissez les compteurs que vous voulez activer. Tous les autres seront désactivés.`
                            )
                    ],
                    components: [row(selector)]
                })
                .catch(log4js.trace);
            const selection = await waitForInteraction({
                componentType: ComponentType.StringSelect,
                user: interaction.user,
                replies: waitForReplies(interaction.client),
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
                        embeds: [replies.noCounter(interaction.member as GuildMember)],
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
                    embeds: [replies.wait(interaction.user)],
                    components: []
                })
                .catch(log4js.trace);

            await counter.setup().catch(log4js.trace);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Compteurs modifiés')
                            .setDescription(
                                `Les compteurs ont été modifiés.\n**${ids.length}** compteur${plurial(ids)} sont maintenant activés`
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
                        embeds: [replies.noCounter(interaction.member as GuildMember)]
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
                            .setTitle('Noms modifié')
                            .setDescription(`Les noms des compteurs ont correctement été modifiés`)
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
                            .setTitle('Compteurs désactivés')
                            .setDescription(
                                `Les compteurs sont déjà désactivés.\nSi vous voulez désactiver le système entier, utilisez plutôt le module (\`/module configurer\`)`
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
                        .setTitle('Compteurs désactivés')
                        .setDescription(`Les compteurs ont été désactivés`)
                ]
            })
            .catch(log4js.trace);
    }
});
