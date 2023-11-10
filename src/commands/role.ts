import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, ColorResolvable, GuildMember, Role } from 'discord.js';
import {
    addModLog,
    basicEmbed,
    checkPerms,
    confirm,
    getHexColor,
    isValidHexColor,
    pingRole,
    pingUser,
    systemReply
} from '../utils/toolbox';
import replies from '../data/replies';
import { getRolePerm, reportToBender, util } from '../utils/functions';
import { permType } from '../typings/functions';
import moduleEnabled from '../preconditions/moduleEnabled';

export default new DraverCommand({
    name: 'role',
    module: 'administration',
    description: 'Gère les rôles du serveur',
    permissions: ['ManageRoles'],
    clientPermissions: ['ManageRoles'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'créer',
            description: 'Créer un rôle',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: 'Nom du rôle',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'couleur',
                    description: 'Couleur du rôle',
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    name: 'raison',
                    description: 'Raison de la création du rôle',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un rôle',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'raison',
                    description: 'Raison de la suppression',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'colorer',
            description: 'Donne une couleur à un rôle',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à colorer',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'couleur',
                    description: 'Couleur du rôle',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'raison',
                    description: 'Raison de la coloration',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'renommer',
            description: 'Renomme un rôle',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à renommer',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'nom',
                    description: 'Nouveau nom du rôle',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'raison',
                    description: 'Raison du renommage',
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'ajouter',
            description: 'Ajoute un rôle à un utilisateur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à ajouter',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'utilisateur',
                    description: 'Utilisateur qui recevra le rôle',
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            name: 'retirer',
            description: 'Retirer un rôle à un utilisateur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à retirer',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'utilisateur',
                    description: "Utilisateur qui n'aura plus le rôle",
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            name: 'permission',
            description: "Gère les permissions d'un rôle",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'accorder',
                    description: 'Accorde une permission à un rôle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'rôle',
                            description: 'Rôle auquel vous voulez ajouter une permission',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            name: 'permission',
                            description: 'Permission que vous voulez ajouter',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    name: 'refuser',
                    description: 'Refuse une permission à un rôle',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'rôle',
                            description: 'Rôle auquel vous voulez refuser une permission',
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            name: 'permission',
                            description: 'Permission que vous voulez retirer',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const checkRolePosition = (position: number) => {
        if ((interaction.member as GuildMember).roles.highest.position <= position) {
            systemReply(interaction, {
                content: '',
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Rôle trop haut')
                        .setDescription(`Ce rôle est supérieur ou égal à vous dans la hiérarchie des rôles`)
                ],
                components: []
            });
            return false;
        }
        if (interaction.guild.members.me.roles.highest.position <= position) {
            systemReply(interaction, {
                content: '',
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Rôle trop haut')
                        .setDescription(`Ce rôle est supérieur ou égal à moi dans la hiérarchie des rôles`)
                ],
                components: []
            });
            return false;
        }
        return true;
    };
    const cmd = options.getSubcommand();

    if (cmd == 'supprimer') {
        const role = options.getRole('rôle', true) as Role;
        if (!checkRolePosition(role.position)) return;

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user, { questionMark: true })
                .setTitle('Supression de rôle')
                .setDescription(`Êtes-vous sûr de vouloir supprimer le rôle ${pingRole(role)} ?`)
        }).catch(log4js.trace);
        if (!confirmation || confirmation == 'cancel' || confirmation.value == false) {
            interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);
            return;
        }

        await Promise.all([
            confirmation.interaction.deferUpdate().catch(log4js.trace),
            role.delete().catch(log4js.trace),
            addModLog({
                guild: interaction.guild,
                member_id: null,
                mod_id: interaction.user.id,
                reason: options.getString('raison') ?? 'Pas de raison',
                type: 'RoleDelete'
            }).catch(log4js.trace),
            reportToBender({
                type: 'RoleDelete',
                user: interaction.user.id,
                guild: interaction.guild.id,
                data: { value: role.toJSON(), permissions: role.permissions.toJSON() }
            })
        ]);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rôle supprimé')
                        .setDescription(`Le rôle ${role.name} a été supprimé`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd == 'créer') {
        const name = options.getString('nom');
        const color = options.getString('couleur');
        const reason = options.getString('raison') ?? 'Pas de raison';

        if (!isValidHexColor(color)) {
            interaction
                .reply({
                    ephemeral: true,
                    embeds: [replies.invalidColor(interaction.member as GuildMember)]
                })
                .catch(log4js.trace);
            return;
        }

        await interaction.deferReply().catch(log4js.trace);
        const role = await interaction.guild.roles
            .create({
                name,
                color: getHexColor(color) as ColorResolvable,
                reason
            })
            .catch(log4js.trace);

        if (!role)
            return interaction.editReply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Échec de la création de rôle')
                        .setDescription(
                            `Le rôle n'a pas pu être crée.\nCela peut être du aux permissions que j'ai sur ce serveur.\nVeuillez vérifier mes permissions et réessayer.\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                'support'
                            )})`
                        )
                ]
            });

        addModLog({
            guild: interaction.guild,
            member_id: null,
            mod_id: interaction.user.id,
            type: 'RoleCreate',
            reason
        }).catch(log4js.trace);
        await reportToBender({
            user: interaction.user.id,
            guild: interaction.guild.id,
            type: 'RoleCreate',
            data: { id: role.id }
        });

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setDescription(`Le rôle ${pingRole(role)} a été crée`)
                        .setTitle('Rôle crée')
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'colorer') {
        const role = options.getRole('rôle', true) as Role;
        const color = options.getString('couleur') ?? '#000000';
        const reason =
            options.getString('raison') ?? `Couleur changée de \`${role.hexColor}\` à \`${getHexColor(color)}\``;

        if (!checkRolePosition(role.position)) return;

        if (!isValidHexColor(color))
            return interaction
                .reply({ embeds: [replies.invalidColor(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);

        const before = JSON.parse(JSON.stringify(role.toJSON()));
        role.setColor(getHexColor(color) as ColorResolvable, reason);

        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            type: 'RoleEdit',
            reason: reason,
            member_id: null
        });
        reportToBender({
            type: 'RoleEdit',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { before, after: role.toJSON() }
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rôle modifié')
                        .setDescription(`La couleur du rôle ${pingRole(role)} a été modifiée`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'renommer') {
        const role = options.getRole('rôle', true) as Role;
        const name = options.getString('nom', true);
        const reason = options.getString('raison') ?? `Nom changé de \`${role.name}\` à \`${name}\``;

        if (!checkRolePosition(role.position)) return;

        const before = JSON.parse(JSON.stringify(role.toJSON()));
        role.setName(name, reason);

        addModLog({
            guild: interaction.guild,
            member_id: null,
            mod_id: interaction.user.id,
            type: 'RoleEdit',
            reason
        });
        reportToBender({
            type: 'RoleEdit',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { before, after: role.toJSON() }
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rôle renommé')
                        .setDescription(`Le rôle ${pingRole(role)} a été renommé`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'ajouter') {
        const role = options.getRole('rôle', true) as Role;
        const user = options.getMember('utilisateur') as GuildMember;

        if (!checkRolePosition(role.position)) return;
        if (
            !checkPerms({
                member: user,
                mod: interaction.member as GuildMember,
                checkClientPosition: true,
                checkModPosition: true,
                sendErrorMessage: true,
                ownerByPass: true,
                checkBot: false,
                interaction
            })
        )
            return;

        if (user.roles.cache.has(role.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Rôle déjà attribué')
                            .setDescription(`${pingUser(user)} a déjà le rôle ${pingRole(role)}`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const res = user.roles.add(role).catch(log4js.trace);
        if (!res) {
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle("Échec de l'ajout de rôle")
                            .setDescription(
                                `Le rôle ${pingRole(role)} n'a pas pu être ajouté à ${pingUser(
                                    user
                                )}.\nIl se peut que le problème vienne de ma position par rapport à ce membre. Vérifiez que mon rôle est situé au-dessus de celui de ${pingUser(
                                    user
                                )} dans la hiérarchie des rôles\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                    'support'
                                )})`
                            )
                    ]
                })
                .catch(log4js.trace);
            return;
        }
        reportToBender({
            type: 'RoleAdded',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { member: user.id, role: role.id }
        });
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rôle ajouté')
                        .setDescription(`Le rôle ${pingRole(role)} a été ajouté à ${pingUser(user)}`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'retirer') {
        const role = options.getRole('rôle', true) as Role;
        const user = options.getMember('utilisateur') as GuildMember;

        if (!checkRolePosition(role.position)) return;
        if (
            !checkPerms({
                member: user,
                mod: interaction.member as GuildMember,
                checkClientPosition: true,
                checkModPosition: true,
                sendErrorMessage: true,
                ownerByPass: true,
                checkBot: false,
                interaction
            })
        )
            return;

        if (!user.roles.cache.has(role.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Rôle non possédé')
                            .setDescription(`${pingUser(user)} n'a pas le rôle ${pingRole(role)}`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const res = user.roles.remove(role).catch(log4js.trace);
        if (!res) {
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Échec du retrait de rôle')
                            .setDescription(
                                `Le rôle ${pingRole(role)} n'a pas pu être retiré à ${pingUser(
                                    user
                                )}.\nIl se peut que le problème vienne de ma position par rapport à ce membre. Vérifiez que mon rôle est situé au-dessus de celui de ${pingUser(
                                    user
                                )} dans la hiérarchie des rôles\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                    'support'
                                )})`
                            )
                    ]
                })
                .catch(log4js.trace);
            return;
        }
        reportToBender({
            type: 'RoleRemoved',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: { member: user.id, role: role.id }
        });
        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rôle retiré')
                        .setDescription(`Le rôle ${pingRole(role)} a été retiré à ${pingUser(user)}`)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'accorder') {
        const role = options.getRole('rôle', true) as Role;
        const permission = options.getString('permission') as permType<'role'>;

        if (!checkRolePosition(role.position)) return;

        if (!(interaction.member as GuildMember).permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (!interaction.guild.members.me.permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.clientMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        await interaction.deferReply().catch(log4js.trace);

        const before = JSON.parse(JSON.stringify(role.toJSON()));
        const res = await role.setPermissions(role.permissions.add(permission)).catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Erreur de permission')
                            .setDescription(
                                `La permission ${getRolePerm(permission)} n'a pas pu être accordée au rôle ${pingRole(
                                    role
                                )}.\nCette erreur peut être causée parce que mon rôle est en-dessous de ${pingRole(
                                    role
                                )}, ou que je ne possède pas la permission ${getRolePerm(
                                    permission
                                )}. Veuillez vous assurez que ces conditions soient bien remplies et réessayez.\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                    'support'
                                )})`
                            )
                    ]
                })
                .catch(log4js.trace);

        await reportToBender({
            type: 'RoleEdit',
            guild: interaction.guild.id,
            user: interaction.user.id,
            data: {
                before,
                after: role.toJSON()
            }
        });
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Permission accordée')
                        .setDescription(
                            `La permission ${getRolePerm(permission)} a été accordée au rôle ${pingRole(role)}`
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'refuser') {
        const role = options.getRole('rôle', true) as Role;
        const permission = options.getString('permission') as permType<'role'>;

        if (!checkRolePosition(role.position)) return;

        if (!(interaction.member as GuildMember).permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (!interaction.guild.members.me.permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.clientMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        await interaction.deferReply().catch(log4js.trace);
        const before = JSON.parse(JSON.stringify(role.toJSON()));
        const res = await role.setPermissions(role.permissions.remove(permission)).catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Erreur de permission')
                            .setDescription(
                                `La permission ${getRolePerm(permission)} n'a pas pu être refusée au rôle ${pingRole(
                                    role
                                )}.\nCette erreur peut être causée parce que mon rôle est en-dessous de ${pingRole(
                                    role
                                )}, ou que je ne possède pas la permission ${getRolePerm(
                                    permission
                                )}. Veuillez vous assurez que ces conditions soient bien remplies et réessayez.\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                    'support'
                                )})`
                            )
                    ]
                })
                .catch(log4js.trace);
        reportToBender({
            type: 'RoleEdit',
            user: interaction.user.id,
            guild: interaction.guild.id,
            data: {
                before,
                after: role.toJSON()
            }
        });
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Permission refusée')
                        .setDescription(
                            `La permission ${getRolePerm(permission)} a été refusée au rôle ${pingRole(role)}`
                        )
                ]
            })
            .catch(log4js.trace);
    }
});
