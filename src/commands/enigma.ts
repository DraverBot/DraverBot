import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ComponentType,
    EmbedBuilder,
    Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { rotors, plugboard as defaultPlugboard, reflector } from '../data/enigmaConfig.json';
import { basicEmbed, buildButton, confirm, numerize, row } from '../utils/toolbox';
import { Enigma, Plugboard, Reflector, Rotor } from 'enigma-machine';
import { ConnectionMap, RotorConfiguration } from 'enigma-machine/build/typings/types';
import { plugboard } from '../typings/database';
import { Paginator } from '../managers/Paginator';
import moduleEnabled from '../preconditions/moduleEnabled';
import replies from '../data/replies';

export default new DraverCommand({
    name: "énigma",
    module: "fun",
    description: 'Chiffre un code avec énigma',
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'chiffrer',
            description: 'Chiffre un message avec Enigma',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'message',
                    description: 'Message à chiffrer',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'rotors',
                    description: 'La configuration des rotors que vous souhaitez',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'branchements',
                    description: 'Utilise un de vos tableaux de branchements',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'branchements',
            description: 'Gère vos branchements enregistrés',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'liste',
                    description: 'Affiche la liste de vos branchements',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'tableau',
                            description: 'Tableau de branchements à afficher',
                            required: false,
                            type: ApplicationCommandOptionType.String,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: 'supprimer',
                    description: 'Supprime un tableau de branchements',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'tableau',
                            description: 'Tableau à supprimer',
                            required: true,
                            autocomplete: true,
                            type: ApplicationCommandOptionType.String
                        }
                    ]
                },
                {
                    name: 'créer',
                    description: 'Crée un tableau de branchements',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'nom',
                            description: 'Nom du tableau',
                            required: true,
                            type: ApplicationCommandOptionType.String
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'chiffrer') {
        const rotorsInput = options.getString('rotors');
        const plugboardInput = options.getString('branchements');
        const message = options.getString('message').toLowerCase().replace(/ +/g, ' ');

        if (message.split('').some((x) => !'abcdefghijklmnopqrstuvwxyz '.includes(x)))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Message invalide')
                            .setDescription(`Le message ne peut contenir que des lettres ou des espaces (sans accents)`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const selectorRotors = rotorsInput.split('').map((r) => rotors.find((x) => x.id === parseInt(r)));
        const plugboard =
            interaction.client.plugboardsManager.getPlugboard(parseInt(plugboardInput))?.plugboard ?? defaultPlugboard;

        const spaces = [];
        for (let i = 0; i < message.length; i++) {
            spaces.push(i);
        }

        const machineReflector = new Reflector(JSON.parse(JSON.stringify(reflector)) as ConnectionMap);
        const machinePlugboard = new Plugboard(JSON.parse(JSON.stringify(plugboard)) as ConnectionMap);
        const machineRotors: [Rotor, Rotor, Rotor] = [
            new Rotor(JSON.parse(JSON.stringify(selectorRotors[0].config)) as RotorConfiguration),
            new Rotor(JSON.parse(JSON.stringify(selectorRotors[1].config)) as RotorConfiguration),
            new Rotor(JSON.parse(JSON.stringify(selectorRotors[2].config)) as RotorConfiguration)
        ];

        const machine = new Enigma(machineRotors, machineReflector, machinePlugboard);

        const ciphered = message
            .split(' ')
            .map((v) => machine.calculateString(v))
            .join(' ');

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle("Chiffre d'énigma")
                        .setDescription(`Voici votre message codé avec la machine Enigma\n\`\`\`${ciphered}\`\`\``)
                        .setFields(
                            {
                                name: 'Rotors',
                                value: `Vous avez utilisé la combinaison de rotors : \`${rotorsInput
                                    .split('')
                                    .map((x) => rotors.find((y) => y.id === parseInt(x)).name)
                                    .join(' ')}\``,
                                inline: false
                            },
                            {
                                name: 'Branchements',
                                value: `Vous avez utilisé ce tableau de branchements :\n\`${Object.keys(plugboard)
                                    .map((k) => `${k}-${plugboard[k]}`)
                                    .join(' ')}\``,
                                inline: false
                            }
                        )
                ],
                ephemeral: true
            })
            .catch(log4js.trace);
    }

    const displayConnections = (connections: ConnectionMap) =>
        Object.keys(connections)
            .map((x) => `\`${x}\` → \`${connections[x]}\``)
            .join('\n');

    if (cmd === 'liste') {
        const plugboard = options.getString('tableau');
        const board = plugboard ? interaction.client.plugboardsManager.getPlugboard(parseInt(plugboard)) : undefined;

        if (board) {
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setDescription(
                            `Voici le tableau de branchements \`${board.name}\`\n\n${displayConnections(
                                board.plugboard
                            )}`
                        )
                        .setTitle('Tableau de branchements Enigma')
                ],
                ephemeral: true
            });
        }

        const boards = interaction.client.plugboardsManager.getUserPlugs(interaction.user.id);
        if (boards.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de tableaux')
                            .setDescription(`Vous n'avez aucun tableaux de branchement`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const embed = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Tableaux de branchements')
                .setDescription(`Voici votre liste de tableaux (${numerize(boards.length)})`);
        const map = (embed: EmbedBuilder, plugboard: plugboard) =>
            embed.addFields({
                name: plugboard.name,
                value: `${Object.keys(plugboard.plugboard)
                    .map((x) => `${x}-${plugboard.plugboard[x]}`)
                    .join(' ')}`,
                inline: true
            });

        if (boards.length <= 5) {
            const display = embed();

            boards.forEach((board) => {
                map(display, board);
            });
            interaction
                .reply({
                    embeds: [display],
                    ephemeral: true
                })
                .catch(log4js.trace);
        } else {
            const embeds = [embed()];

            boards.forEach((board, i) => {
                if (i % 5 == 0 && i > 0) embeds.push(embed());

                map(embeds[embeds.length - 1], board);
            });

            new Paginator({
                interaction,
                user: interaction.user,
                embeds,
                ephemeral: true,
                time: 180000
            });
        }
    }
    if (cmd === 'supprimer') {
        const board = interaction.client.plugboardsManager.getPlugboard(parseInt(options.getString('tableau')));

        if (!board)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Tableau inexistant')
                            .setDescription(`Ce tableau n'existe pas`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            ephemeral: true,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression')
                .setDescription(`Êtes-vous sûr de vouloir supprimer \`${board.name} ?\``)
        }).catch(log4js.trace);

        if (!confirmation || confirmation == 'cancel' || !confirmation.value)
            return interaction.editReply({ embeds: [replies.cancel()], components: [] }).catch(log4js.trace);

        await Promise.all([
            interaction.editReply({ embeds: [replies.wait(interaction.user)], components: [] }).catch(log4js.trace),
            interaction.client.plugboardsManager.deletePlugboard(board.id)
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Tableau supprimé')
                        .setDescription(`Le tableau \`${board.name}\` a été supprimé`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'créer') {
        const name = options.getString('nom');
        if (interaction.client.plugboardsManager.getUserPlugs(interaction.user.id).find((x) => x.name === name))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Nom déjà pris')
                            .setDescription(`Ce nom est celui d'un tableau que vous avez déjà crée`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const connections = JSON.parse(JSON.stringify(defaultPlugboard)) as ConnectionMap;
        const embed = () =>
            basicEmbed(interaction.user, { questionMark: true })
                .setTitle('Création')
                .setDescription(
                    `Voici à quoi ressemble le tableau pour l'instant\n\n${displayConnections(connections)}`
                );
        const components = (allDisabled?: boolean) => [
            row(
                buildButton({ label: 'Échanger des lettres', style: 'Primary', id: 'swap', disabled: !!allDisabled }),
                buildButton({ label: 'Valider', style: 'Success', id: 'validate', disabled: !!allDisabled }),
                buildButton({ label: 'Annuler', style: 'Danger', id: 'cancel', disabled: !!allDisabled })
            )
        ];

        const builder = (await interaction
            .reply({
                ephemeral: true,
                embeds: [embed()],
                components: components(),
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;
        if (!builder) return;

        const collector = builder.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (button) => {
            // Don't need to do a check, it is ephemeral
            if (button.customId === 'cancel') {
                interaction.editReply({ components: components(true) }).catch(log4js.trace);
                const confirmation = await confirm({
                    interaction: button,
                    user: interaction.user,
                    ephemeral: true,
                    time: 120000,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Annulation')
                        .setDescription(`Êtes-vous sûr d'annuler la création de \`${name}\` ?`)
                }).catch(log4js.trace);

                if (!confirmation || confirmation == 'cancel' || !confirmation.value) {
                    button.deleteReply().catch(log4js.trace);
                    interaction.editReply({ components: components() }).catch(log4js.trace);
                    return;
                }

                button.deleteReply().catch(log4js.trace);
                interaction.editReply({ embeds: [replies.cancel()], components: [] }).catch(log4js.trace);
                collector.stop('canceled');
            }
            if (button.customId === 'validate') {
                interaction.editReply({ components: components(true) }).catch(log4js.trace);
                const confirmation = await confirm({
                    interaction: button,
                    user: interaction.user,
                    ephemeral: true,
                    time: 120000,
                    embed: basicEmbed(interaction.user)
                        .setTitle('Validation')
                        .setDescription(`Êtes-vous sûr d'avoir terminé la création de \`${name}\` ?`)
                }).catch(log4js.trace);

                if (!confirmation || confirmation == 'cancel' || !confirmation.value) {
                    interaction.editReply({ components: components() }).catch(log4js.trace);
                    button.deleteReply().catch(log4js.trace);
                    return;
                }

                button.deleteReply().catch(log4js.trace);
                await interaction
                    .editReply({ embeds: [replies.wait(interaction.user)], components: [] })
                    .catch(log4js.trace);
                await interaction.client.plugboardsManager
                    .addPlugboard({ userId: interaction.user.id, name, connections })
                    .catch(log4js.trace);

                interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Tableau ajouté')
                                .setDescription(`Le tableau \`${name}\` a été ajouté dans vos tableaux`)
                        ]
                    })
                    .catch(log4js.trace);
                collector.stop('finished');
            }
            if (button.customId === 'swap') {
                const modal = new ModalBuilder()
                    .setTitle('Échange')
                    .setCustomId('plugboard-swap')
                    .setComponents(
                        row(
                            new TextInputBuilder()
                                .setStyle(TextInputStyle.Short)
                                .setLabel('Première lettre')
                                .setCustomId('first')
                                .setMaxLength(1)
                                .setRequired(true)
                        ),
                        row(
                            new TextInputBuilder()
                                .setStyle(TextInputStyle.Short)
                                .setLabel('Deuxième lettre')
                                .setCustomId('second')
                                .setMaxLength(1)
                                .setRequired(true)
                        )
                    );

                await button.showModal(modal).catch(log4js.trace);
                const modalReply = await button.awaitModalSubmit({ time: 120000 }).catch(log4js.trace);

                if (!modalReply) return;
                const first = modalReply.fields.getTextInputValue('first')?.toLowerCase();
                const second = modalReply.fields.getTextInputValue('second')?.toLowerCase();

                if (!'abcdefghijklmnopqrstuvwxyz'.includes(first) || !'abcdefghijklmnopqrstuvwxyz'.includes(second)) {
                    modalReply
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Lettre invalide')
                                    .setDescription(`Une des deux options spécifiée n'est pas une lettre`)
                            ],
                            ephemeral: true
                        })
                        .catch(log4js.trace);
                    return;
                }

                if (first === second) {
                    modalReply
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Lettres identiques')
                                    .setDescription(`Les lettres ne peuvent pas être identiques`)
                            ],
                            ephemeral: true
                        })
                        .catch(log4js.trace);
                    return;
                }
                if (connections[first] !== first || connections[second] !== second) {
                    modalReply
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Lettres échangées')
                                    .setDescription(`Une des lettres spécifiée à déjà été échangée`)
                            ],
                            ephemeral: true
                        })
                        .catch(log4js.trace);
                    return;
                }

                const old = connections[first];
                connections[first] = connections[second];
                connections[second] = old;

                modalReply.deferUpdate().catch(log4js.trace);

                interaction.editReply({ embeds: [embed()] }).catch(log4js.trace);
            }
        });

        collector.on('end', (_c, r) => {
            if (r !== 'finished' && r !== 'canceled') {
                interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
            }
        });
    }
});
