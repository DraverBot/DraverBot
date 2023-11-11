import { DraverCommand } from '../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import {
    ApplicationCommandOptionType,
    BaseChannel,
    BaseGuildTextChannel,
    CategoryChannel,
    ChannelType,
    GuildChannel,
    GuildMember,
    PermissionsString,
    Role
} from 'discord.js';
import {
    addModLog,
    basicEmbed,
    checkRolePosition,
    codeBox,
    confirm,
    evokerColor,
    hint,
    numerize,
    pingChan,
    pingRole,
    plurial,
    resizeString,
    subcmd
} from '../utils/toolbox';
import { channelTypeName, getChannelPerm, reportToBender, util } from '../utils/functions';
import { ChannelCreateChannelTypeOptions, ChannelMoveSens } from '../typings/commands';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export default new DraverCommand({
    name: 'salon',
    module: 'administration',
    description: 'Gère un salon',
    permissions: ['ManageChannels'],
    clientPermissions: ['ManageChannels'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'créer',
            description: 'Créer un salon dans le serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: 'Nom du salon',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'type',
                    description: 'Type du salon',
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    choices: ChannelCreateChannelTypeOptions
                },
                {
                    name: 'catégorie',
                    description: 'Catégorie du salon',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildCategory]
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un salon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
        {
            name: 'renommer',
            description: 'Renomme un salon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à renommer',
                    type: ApplicationCommandOptionType.Channel,
                    required: true
                },
                {
                    name: 'nom',
                    description: 'Nouveau nom du salon',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'décrire',
            description: "Définit la description d'un salon",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à décrire',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
                },
                {
                    name: 'description',
                    description: 'Description du salon',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'identifier',
            description: "Affiche l'identifiant d'un salon",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à identifier',
                    required: false,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
        {
            name: 'déplacer',
            description: 'Déplace un salon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à déplacer',
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                },
                {
                    name: 'places',
                    description: 'Nombre de places dont le salon doit être déplacé',
                    required: true,
                    type: ApplicationCommandOptionType.Integer
                },
                {
                    name: 'direction',
                    description: 'Direction du changement de place',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    choices: [
                        {
                            name: 'Vers le haut',
                            value: ChannelMoveSens.Up
                        },
                        {
                            name: 'Vers le bas',
                            value: ChannelMoveSens.Down
                        }
                    ]
                }
            ]
        },
        {
            name: 'catégoriser',
            description: "Change la catégorie d'un salon",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à catégoriser',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [
                        ChannelType.GuildForum,
                        ChannelType.GuildText,
                        ChannelType.GuildAnnouncement,
                        ChannelType.GuildVoice,
                        ChannelType.GuildStageVoice
                    ]
                },
                {
                    name: 'catégorie',
                    description: 'Catégorie dans laquelle il faut mettre le salon',
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildCategory]
                }
            ]
        },
        {
            name: 'permissions',
            description: "Gère les permissions d'un salon",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'accorder',
                    type: ApplicationCommandOptionType.Subcommand,
                    description: 'Accorde une permission à un rôle',
                    options: [
                        {
                            name: 'permission',
                            description: 'Permission à accorder',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        },
                        {
                            name: 'rôle',
                            description: 'Rôle à qui je dois accorder la permission',
                            required: true,
                            type: ApplicationCommandOptionType.Role
                        },
                        {
                            name: 'salon',
                            required: false,
                            description: 'Salon où il faut ajouter les permissions',
                            type: ApplicationCommandOptionType.Channel
                        }
                    ]
                },
                {
                    name: 'refuser',
                    description: 'Refuse une permission à un rôle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'permission',
                            description: 'Permission à refuser',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            autocomplete: true
                        },
                        {
                            name: 'rôle',
                            description: 'Rôle à qui je dois refuser la permission',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            name: 'salon',
                            description: 'Salon où il faut refuser la permission',
                            type: ApplicationCommandOptionType.Channel,
                            required: false
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const name = options.getString('nom');
        const type = options.getInteger('type');
        const parent = options.getChannel('catégorie') as undefined | CategoryChannel;

        if (
            [ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildStageVoice].includes(type) &&
            !interaction.guild.features.includes('COMMUNITY')
        )
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Communautée désactivée')
                            .setDescription(
                                `Vous ne pouvez pas créer de salon **${channelTypeName(
                                    ChannelType[type] as keyof typeof ChannelType
                                )}** sans activer la communautée`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        if (type === ChannelType.GuildCategory && parent)
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Salon invalide')
                        .setDescription(
                            `Vous ne pouvez pas créer une catégorie dans une catégorie.\nEssayez cette commande à la place :\n${codeBox(
                                `/salon créer nom: ${name} type: ${
                                    ChannelCreateChannelTypeOptions.find((x) => x.value === type).name
                                }`
                            )}`
                        )
                        .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            });
        await interaction.deferReply().catch(() => {});
        const channel = (await interaction.guild.channels
            .create({
                name: name.replace(/ +/g, '-'),
                type,
                parent: parent ?? null
            })
            .catch(() => {})) as BaseChannel;
        if (!channel)
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de création')
                            .setDescription(
                                `Le salon n'a pas pu être crée.\n${hint(
                                    `Ce peut être du au nom du salon ou au réglage de mes permissions\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                        'support'
                                    )}`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        await Promise.all([
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                member_id: '',
                reason: `Création de ${pingChan(channel)} ( ${name} \`${channel.id}\` )`,
                type: 'ChannelCreate'
            }),
            reportToBender({
                type: 'ChannelCreate',
                guild: interaction.guild.id,
                user: interaction.user.id,
                data: { id: channel.id }
            })
        ]);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon crée')
                        .setDescription(`Le salon a été crée dans ${pingChan(channel)}`)
                ]
            })
            .catch(console.log);
        if (channel.isTextBased())
            channel
                .send({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Salon crée')
                            .setDescription(`Salon crée par ${interaction.user}`)
                    ]
                })
                .catch(() => {});
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon', true) as GuildChannel;

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression de salon')
                .setDescription(`Êtes-vous sûr de supprimer le salon ${pingChan(channel)} ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                components: [],
                embeds: [replies.wait(interaction.user)]
            })
            .catch(() => {});
        const res = await channel.delete().catch(() => {});
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon non-supprimé')
                            .setDescription(
                                `Le salon ${pingChan(channel)} n'a pas pu être supprimé.\n${hint(
                                    `Réessayez en vérifiant mes permissions dans ce salon.\nSi l'erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        await Promise.all([
            addModLog({
                guild: interaction.guild,
                member_id: '',
                mod_id: interaction.user.id,
                type: 'ChannelDelete',
                reason: `Suppression du salon ${(channel as { name?: string })?.name ?? '*nom inconnu*'} ( \`${
                    channel.id
                }\` )`
            }).catch(() => {}),
            reportToBender({
                type: 'ChannelDelete',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { value: channel.toJSON(), permissions: channel.permissionOverwrites.cache.toJSON() }
            })
        ]);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(`Salon supprimé`)
                        .setDescription(
                            `Le salon ${(channel as { name?: string })?.name ?? '*salon inconnu*'} a été supprimé`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'renommer') {
        const channel = options.getChannel('salon') as GuildChannel;
        const name = options.getString('nom');

        await interaction.deferReply().catch(() => {});
        const before = JSON.parse(JSON.stringify(channel.toJSON()));
        const res = await channel.setName(name.replace(/ +/g, '-')).catch(() => {});

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de renommage')
                            .setDescription(
                                `Le salon ${pingChan(
                                    channel
                                )} n'a pas pu être renommé.\nLa cause la plus fréquente est le manque de permission.\n${hint(
                                    `Vérifiez mes permissions dans ce salon et réessayez\nSi l'erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                member_id: '',
                type: 'ChannelEdit',
                reason: `Renommage du salon ${channel.name} ( \`${channel.id}\` )`
            }).catch(() => {}),
            reportToBender({
                type: 'ChannelEdit',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { before, after: channel.toJSON() }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Renommage de salon')
                        .setDescription(`Le salon ${pingChan(channel)} a été renommé`)
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'décrire') {
        const channel = options.getChannel('salon') as BaseGuildTextChannel;
        const description = options.getString('description') ?? null;

        await interaction.deferReply().catch(() => {});
        const before = JSON.parse(JSON.stringify(channel.toJSON()));
        const res = await channel
            .setTopic(description, `Description par ${interaction.user.tag} (${interaction.user.id})`)
            .catch(() => {});
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de description')
                            .setDescription(
                                `Le salon ${pingChan(channel)} n'a pas pu être renommé\n${hint(
                                    `Une des raisons communes peut être que je n'ai pas les permissions dans ce salon.\nVérifiez mes permissions, puis réessayez.\nSi cette erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                reason: `Description du salon ${pingChan(channel)} ( ${resizeString({
                    str: channel.name,
                    length: 50
                })} \`${channel.id}\` ) ${description ? 'modifiée' : 'supprimée'}`,
                type: 'ChannelEdit',
                mod_id: interaction.user.id,
                member_id: ''
            }).catch(() => {}),
            reportToBender({
                type: 'ChannelEdit',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { before, after: channel.toJSON() }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon décrit')
                        .setDescription(
                            `La description du salon ${pingChan(channel)} a été ${
                                description ? 'modifiée' : 'supprimée'
                            }`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'identifier') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as GuildChannel;
        interaction
            .reply({
                content: `L'identifiant du salon ${pingChan(channel)} est \`${channel.id}\``
            })
            .catch(() => {});
    }
    if (cmd === 'déplacer') {
        const channel = options.getChannel('salon') as GuildChannel;
        const places = options.getInteger('places');
        const sens = (options.getString('direction') as ChannelMoveSens) ?? ChannelMoveSens.Down;

        const newPlace = channel.position + places * (sens === ChannelMoveSens.Up ? -1 : 1);
        await interaction.deferReply().catch(() => {});
        const before = JSON.parse(JSON.stringify(channel.toJSON()));

        const res = await channel.setPosition(newPlace).catch(() => {});
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de positionnement')
                            .setDescription(
                                `Le salon ${pingChan(channel)} n'a pas pu être déplacé.\n${hint(
                                    `La raison la plus commune est que je ne possède pas les permissions dans ce salon.\nVérifiez mes permissions et réessayez\nSI l'erreur se reproduit, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                mod_id: interaction.user.id,
                member_id: null,
                type: 'ChannelEdit',
                reason: `Déplaçage du salon ${pingChan(channel)} ( ${resizeString({
                    str: channel.name,
                    length: 50
                })} \`${channel.id}\` ) de ${numerize(places)} place${plurial(places)} vers le ${
                    sens === ChannelMoveSens.Up ? 'haut' : 'bas'
                }`
            }).catch(() => {}),
            reportToBender({
                type: 'ChannelEdit',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { before, after: channel.toJSON() }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Déplaçage de salon')
                        .setDescription(
                            `Le salon ${pingChan(channel)} a été déplacé de **${numerize(places)}** place${plurial(
                                places
                            )} vers le ${sens === ChannelMoveSens.Up ? 'haut' : 'bas'}`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'catégoriser') {
        const channel = options.getChannel('salon') as GuildChannel;
        const parent = (options.getChannel('catégorie') ?? null) as CategoryChannel | null;

        if (!channel.parent && !parent)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Salon non-catégorisé')

                            .setDescription(`Le salon ${pingChan(channel)} n'a, déjà, pas de catégorie`)
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        if (channel.parent?.id === parent?.id)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Salon déjà catégorisé')
                            .setDescription(`Le salon ${pingChan(channel)} est déjà dans la catégorie ${parent.name}`)
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        await interaction.deferReply().catch(() => {});
        const before = JSON.parse(JSON.stringify(channel.toJSON()));
        const res = await channel.setParent(parent).catch(() => {});

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de catégorisation')
                            .setDescription(
                                `Je n'ai pas pu déplacer le salon ${pingChan(channel)}\n${hint(
                                    `La raison la plus commune est que je n'ai pas les permissions de gérer ce salon.\nVérifiez mes permissions et réessayez\nSi l'erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await Promise.all([
            addModLog({
                guild: interaction.guild,
                type: 'ChannelEdit',
                member_id: null,
                mod_id: interaction.user.id,
                reason: `Le salon ${pingChan(channel)} ( ${resizeString({ str: channel.name, length: 50 })} \`${
                    channel.id
                }\` ) a été ${
                    parent
                        ? `Déplacé dans la catégorie ${resizeString({ str: parent.name, length: 50 })}`
                        : `décatégorisé`
                }`
            }).catch(() => {}),
            reportToBender({
                type: 'ChannelEdit',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { before, after: channel.toJSON() }
            })
        ]);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon catégorisé')
                        .setDescription(
                            `Le salon ${pingChan(channel)} ${
                                parent ? `a été déplacé dans la catégorie ${parent.name}` : `a été décatégorisé`
                            }`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'accorder') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as GuildChannel;
        const permission = options.getString('permission') as PermissionsString;
        const role = options.getRole('rôle') as Role;

        if (!checkRolePosition({ interaction, member: interaction.member as GuildMember, role, respond: true })) return;

        if (
            channel.permissionOverwrites.cache.has(role.id) &&
            channel.permissionOverwrites.cache.get(role.id).allow.has(permission)
        )
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Permission déjà accordée')
                            .setDescription(
                                `La permission **${getChannelPerm(
                                    permission
                                )}** est déjà accordée pour le rôle ${pingRole(role)} dans ${pingChan(channel)}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        const x = channel.permissionOverwrites.cache.get(role.id)?.toJSON() ?? {};
        x[permission] = true;
        const before = JSON.parse(JSON.stringify(channel.toJSON()));

        if (channel.permissionOverwrites.cache.has(role.id))
            channel.permissionOverwrites.cache.get(role.id).edit(x).catch(console.log);
        else channel.permissionOverwrites.create(role, x).catch(console.log);

        reportToBender({
            type: 'ChannelEdit',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { before, after: channel.toJSON() }
        });
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Permission accordée')
                        .setDescription(
                            `La permission **${getChannelPerm(permission)}** a été accordée au rôle ${pingRole(
                                role
                            )} dans ${pingChan(channel)}`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'refuser') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as GuildChannel;
        const permission = options.getString('permission') as PermissionsString;
        const role = options.getRole('rôle') as Role;

        if (!checkRolePosition({ interaction, member: interaction.member as GuildMember, role, respond: true })) return;

        if (
            channel.permissionOverwrites.cache.has(role.id) &&
            !channel.permissionOverwrites.cache.get(role.id).allow.has(permission)
        )
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Permission non-accordée')
                            .setDescription(
                                `La permission **${getChannelPerm(
                                    permission
                                )}** n'est pas accordée pour le rôle ${pingRole(role)} dans ${pingChan(channel)}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        const x = channel.permissionOverwrites.cache.get(role.id)?.toJSON() ?? {};
        x[permission] = false;

        const before = JSON.parse(JSON.stringify(channel.toJSON()));
        if (channel.permissionOverwrites.cache.has(role.id))
            channel.permissionOverwrites.cache.get(role.id).edit(x).catch(console.log);
        else channel.permissionOverwrites.create(role, x).catch(console.log);

        reportToBender({
            type: 'ChannelEdit',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { before, after: channel.toJSON() }
        });
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Permission accordée')
                        .setDescription(
                            `La permission **${getChannelPerm(permission)}** a été refusée au rôle ${pingRole(
                                role
                            )} dans ${pingChan(channel)}`
                        )
                ]
            })
            .catch(() => {});
    }
});
