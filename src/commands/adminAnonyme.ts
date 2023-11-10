import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, preconditions, waitForInteraction, waitForMessage } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    ButtonInteraction,
    ChannelType,
    ComponentType,
    EmbedBuilder,
    Message,
    TextChannel
} from 'discord.js';
import {
    basicEmbed,
    buildButton,
    confirm,
    evokerColor,
    hint,
    numerize,
    pagination,
    pingChan,
    pingRole,
    pingUser,
    plurial,
    row,
    subcmd,
    waitForReplies
} from '../utils/toolbox';
import { AnonymousValue } from '../managers/Anonymous';
import { cancelButton } from '../data/buttons';
import replies from '../data/replies';
import { confirmReturn } from '../typings/functions';

export default new DraverCommand({
    name: 'adminanonymat',
    module: 'config',
    description: 'Configure les salons anonymes du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    options: [
        {
            name: 'configurer',
            description: "Configure un salon d'anonymat dans le serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: "Salon sur lequel l'anonymat sera configuré",
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText],
                    required: true
                },
                {
                    name: 'nom',
                    description: 'Nom qui sera donné au webhook',
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: 'liste',
            description: 'Affiche la liste des salons anonymes du serveur',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'salon',
            description: "Affiche les informations d'un salon anonyme",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon anonyme',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channel_types: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: 'bannissements',
            type: ApplicationCommandOptionType.Subcommand,
            description: "Gère les bannissements d'un salon anonyme",
            options: [
                {
                    name: 'salon',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                    description: 'Salon à gérer'
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprimer un salon anonyme',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon anonyme',
                    type: ApplicationCommandOptionType.Channel,
                    channel_types: [ChannelType.GuildText],
                    required: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'configurer') {
        const channel = options.getChannel('salon') as TextChannel;
        const name = options.getString('nom') ?? 'Anonyme';

        if (interaction.client.AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon déjà configuré')
                            .setDescription(`Le salon ${pingChan(channel)} est déjà un salon anonyme`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await interaction.deferReply().catch(() => {});
        const result = await interaction.client.AnonymousManager.create({
            guild: interaction.guild,
            channel,
            name
        }).catch(() => {});

        if (result === 'webhook creation failed')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setDescription(`Le webhook n'a pas pu être crée dans le salon ${pingChan(channel)}`)
                            .setTitle('Erreur de création')
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon anonyme crée')
                        .setDescription(`Le salon ${pingChan(channel)} est maintenant anonyme`)
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'liste') {
        const list = interaction.client.AnonymousManager.values
            .filter((x) => x.data.guild_id === interaction.guild.id)
            .toJSON();
        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de salon')
                            .setDescription(`Aucun salon anonyme n'est configuré`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const map = (embed: EmbedBuilder, { data, bannedRoles, bannedUsers }: AnonymousValue) => {
            return embed.addFields({
                name: data.name,
                value: `Dans ${pingChan(data.channel_id)} ( ${numerize(bannedRoles.length)} rôle${plurial(
                    data.banned_roles.length
                )} banni${plurial(bannedRoles)} et ${numerize(bannedUsers.length)} utilisateur${plurial(
                    bannedUsers
                )} banni${plurial(bannedUsers)} )`,
                inline: false
            });
        };
        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Salons anonymes')
                .setDescription(
                    `${numerize(list.length)} salon${plurial(list)} ${plurial(list, {
                        singular: 'est',
                        plurial: 'sont'
                    })} anonyme${plurial(list)}`
                );
        };

        if (list.length <= 5) {
            const embed = basic();

            for (const l of list) {
                map(embed, l);
            }

            interaction
                .reply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds = [basic()];

            list.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                map(embeds[embeds.length - 1], v);
            });

            pagination({
                interaction,
                embeds,
                user: interaction.user
            });
        }
    }
    if (cmd === 'salon') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!interaction.client.AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon non-anonyme')
                            .setDescription(`Le salon ${pingChan(channel)} n'est pas anonyme`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = interaction.client.AnonymousManager.values.find((x) => x.data.channel_id === channel.id);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon anonyme')
                        .setDescription(`Salon: ${pingChan(channel)}\nNom du webhook: \`${data.data.name}\``)
                        .setFields(
                            {
                                name: `Rôles bannis [${numerize(data.bannedRoles.length)}]`,
                                value: data.bannedRoles.length > 0 ? data.bannedRoles.map(pingRole).join(' ') : 'Aucun',
                                inline: false
                            },
                            {
                                name: `Utilisateur bannis [${numerize(data.bannedUsers.length)}]`,
                                value: data.bannedUsers.length > 0 ? data.bannedUsers.map(pingUser).join(' ') : 'Aucun',
                                inline: true
                            }
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'bannissements') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!interaction.client.AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon non-anonyme')
                            .setDescription(`Le salon ${pingChan(channel)} n'est pas anonyme`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = interaction.client.AnonymousManager.values.find((x) => x.data.channel_id === channel.id);

        const msg = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user, { questionMark: true })
                    .setTitle('Contrôle des bannissements')
                    .setDescription(`Que voulez-vous faire avec les bannissements du salon ${pingChan(channel)} ?`)
            ],
            fetchReply: true,
            components: [
                row(
                    buildButton({ label: 'Ajouter un rôle', style: 'Primary', id: 'addRole' }),
                    buildButton({
                        label: 'Retirer un rôle',
                        style: 'Secondary',
                        id: 'removeRole'
                    })
                ),
                row(
                    buildButton({
                        label: 'Ajouter un utilisateur',
                        style: 'Primary',
                        id: 'addUser'
                    }),
                    buildButton({
                        label: 'Retirer un utilisateur',
                        style: 'Secondary',
                        id: 'removeUser'
                    })
                ),
                row(cancelButton())
            ]
        })) as Message<true>;

        const choice = (await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: interaction.user,
            replies: waitForReplies(interaction.client)
        }).catch(() => {})) as ButtonInteraction;

        if (!choice || choice.customId === 'cancel')
            return interaction
                .editReply({
                    components: [],
                    embeds: [replies.cancel()]
                })
                .catch(() => {});

        if (choice.customId === 'addUser') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Utilisateur')
                            .setDescription(
                                `Qui est l'utilisateur que vous voulez ajouter ?\nRépondez avec son identifiant ou sa mention dans le chat\n${hint(
                                    `Vous avez **deux minutes**\nRépondez par \`cancel\` pour annuler`
                                )}`
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            const user = rep.mentions.users.first() || interaction.guild.members.cache.get(rep.content)?.user;
            if (!user)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Utilisateur introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver l'utilisateur.\nRéessayez la commande avec un identifiant ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            interaction.client.AnonymousManager.addBannedUser(data.data.id.toString(), user.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Utilisateur ajouté')
                            .setDescription(
                                `${pingUser(user)} est n'est désormais plus anonyme dans ${pingChan(channel)}`
                            )
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'addRole') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Rôle')
                            .setDescription(
                                `Quel est le rôle que vous voulez ajouter ?\nRépondez avec son identifiant ou sa mention dans le chat\n${hint(
                                    `Vous avez **deux minutes**\nRépondez par \`cancel\` pour annuler`
                                )}`
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            const role = rep.mentions.roles.first() || interaction.guild.roles.cache.get(rep.content);
            if (!role)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Role introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver le rôle.\nRéessayez la commande avec un identifiant ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            interaction.client.AnonymousManager.addBannedRole(data.data.id.toString(), role.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Rôle ajouté')
                            .setDescription(
                                `${pingRole(role)} est n'est désormais plus anonyme dans ${pingChan(channel)}`
                            )
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'removeUser') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Utilisateur')
                            .setDescription(
                                `Qui est l'utilisateur que vous voulez retirer ?\nRépondez avec son identifiant ou sa mention dans le chat\n${hint(
                                    `Vous avez **deux minutes**\nRépondez par \`cancel\` pour annuler`
                                )}`
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            const user = rep.mentions.users.first() || interaction.guild.members.cache.get(rep.content)?.user;
            if (!user)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Utilisateur introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver l'utilisateur.\nRéessayez la commande avec un identifiant ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            interaction.client.AnonymousManager.removeBannedUser(data.data.id.toString(), user.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Utilisateur retiré')
                            .setDescription(`${pingUser(user)} est est à nouveau anonyme dans ${pingChan(channel)}`)
                    ]
                })
                .catch(() => {});
        }
        if (choice.customId === 'removeRole') {
            await interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Rôle')
                            .setDescription(
                                `Quel est le rôle que vous voulez retirer ?\nRépondez avec son identifiant ou sa mention dans le chat\n${hint(
                                    `Vous avez **deux minutes**\nRépondez par \`cancel\` pour annuler`
                                )}`
                            )
                    ],
                    components: []
                })
                .catch(() => {});

            const rep = (await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user
            }).catch(() => {})) as Message<true>;

            if (rep && rep.deletable) rep.delete().catch(() => {});
            if (!rep || rep.content.toLowerCase() === 'cancel')
                return interaction
                    .editReply({
                        embeds: [replies.cancel()]
                    })
                    .catch(() => {});

            const role = rep.mentions.roles.first() || interaction.guild.roles.cache.get(rep.content);
            if (!role)
                return interaction
                    .editReply({
                        embeds: [
                            basicEmbed(interaction.user)
                                .setTitle('Role introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver le rôle.\nRéessayez la commande avec un identifiant ou une mention`
                                )
                                .setColor(evokerColor(interaction.guild))
                        ]
                    })
                    .catch(() => {});

            interaction.client.AnonymousManager.removeBannedRole(data.data.id.toString(), role.id);
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Rôle retiré')
                            .setDescription(`${pingRole(role)} est est à nouveau anonyme dans ${pingChan(channel)}`)
                    ]
                })
                .catch(() => {});
        }
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon') as TextChannel;
        if (!interaction.client.AnonymousManager.isConfigured(channel))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon non-anonyme')
                            .setDescription(`Le salon ${pingChan(channel)} n'est pas anonyme`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const data = interaction.client.AnonymousManager.values.find((x) => x.data.channel_id === channel.id);
        const confirmation = (await confirm({
            interaction: interaction,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression de salon')
                .setDescription(
                    `Vous allez désanonimiser le salon ${pingChan(channel)}.\nVoulez-vous poursuivre ?\n${hint(
                        `Le salon ne sera pas supprimé`
                    )}`
                ),
            user: interaction.user
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon désanonymisé')
                        .setDescription(`Le salon ${pingChan(channel)} n'est plus anonyme`)
                ],
                components: []
            })
            .catch(() => {});
        interaction.client.AnonymousManager.delete(data.data.id.toString()).catch(() => {});
    }
});
