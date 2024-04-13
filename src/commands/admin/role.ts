import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
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
} from '../../utils/toolbox';
import replies from '../../data/replies';
import { getRolePerm, reportToBender, util } from '../../utils/functions';
import { permType } from '../../typings/functions';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.role'),
    module: 'administration',
    permissions: ['ManageRoles'],
    clientPermissions: ['ManageRoles'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.admins.role.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.create.options.name'),
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.role.options.create.options.color'),
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    ...translator.commandData('commands.admins.role.options.create.options.reason'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.delete.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    ...translator.commandData('commands.admins.role.options.delete.options.reason'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.color'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.color.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    ...translator.commandData('commands.admins.role.options.color.options.color'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.role.options.color.options.reason'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.rename'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.rename.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    ...translator.commandData('commands.admins.role.options.rename.options.name'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    ...translator.commandData('commands.admins.role.options.rename.options.reason'),
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.add'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.add.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    ...translator.commandData('commands.admins.role.options.add.options.user'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.remove'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.remove.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                },
                {
                    ...translator.commandData('commands.admins.role.options.remove.options.user'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.role.options.perm'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.role.options.perm.options.grant'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.role.options.perm.options.grant.options.role'),
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            ...translator.commandData('commands.admins.role.options.perm.options.grant.options.perm'),
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.role.options.perm.options.remove'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.role.options.perm.options.remove.options.role'),
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        },
                        {
                            ...translator.commandData('commands.admins.role.options.perm.options.remove.options.perm'),
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
    const checkRolePosition = (role: Role) => {
        if ((interaction.member as GuildMember).roles.highest.position <= role.position) {
            systemReply(interaction, {
                content: '',
                embeds: [
                    replies.roleTooHigh(interaction.member as GuildMember, role, interaction)
                ],
                components: []
            });
            return false;
        }
        if (interaction.guild.members.me.roles.highest.position <= role.position) {
            systemReply(interaction, {
                content: '',
                embeds: [
                    replies.roleTooHighClient(interaction.member as GuildMember, role, interaction)
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
        if (!checkRolePosition(role)) return;

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user, { questionMark: true })
                .setTitle(translator.translate('commands.admins.role.replies.delete.confirm.title', interaction))
                .setDescription(translator.translate('commands.admins.role.replies.delete.confirm.description', interaction, { role: pingRole(role) }))
        }).catch(log4js.trace);
        if (!confirmation || confirmation == 'cancel' || confirmation.value == false) {
            interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
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
                        .setTitle(translator.translate('commands.admins.role.replies.delete.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.role.replies.delete.done.description', interaction, { name: role.name }))
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
                    embeds: [replies.invalidColor(interaction.member as GuildMember, interaction)]
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
                        .setTitle(translator.translate('commands.admins.role.replies.create.error.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.role.replies.create.error.description', interaction)
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
                        .setDescription(translator.translate('commands.admins.role.replies.create.done.description', interaction, { role: pingRole(role) }))
                        .setTitle(translator.translate('commands.admins.role.replies.create.done.title', interaction))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'colorer') {
        const role = options.getRole('rôle', true) as Role;
        const color = options.getString('couleur') ?? '#000000';
        const reason =
            options.getString('raison') ?? `Couleur changée de \`${role.hexColor}\` à \`${getHexColor(color)}\``;

        if (!checkRolePosition(role)) return;

        if (!isValidHexColor(color))
            return interaction
                .reply({
                    embeds: [replies.invalidColor(interaction.member as GuildMember, interaction)],
                    ephemeral: true
                })
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
                        .setTitle(translator.translate('commands.admins.role.replies.color.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.role.replies.color.done.description', interaction, { role: pingRole(role) }))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'renommer') {
        const role = options.getRole('rôle', true) as Role;
        const name = options.getString('nom', true);
        const reason = options.getString('raison') ?? `Nom changé de \`${role.name}\` à \`${name}\``;

        if (!checkRolePosition(role)) return;

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
                        .setTitle(translator.translate('commands.admins.role.replies.rename.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.role.replies.rename.done.description', interaction, { role: pingRole(role) }))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'ajouter') {
        const role = options.getRole('rôle', true) as Role;
        const user = options.getMember('utilisateur') as GuildMember;

        if (!checkRolePosition(role)) return;
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
                            .setTitle(translator.translate('commands.admins.role.replies.add.has.title', interaction))
                            .setDescription(translator.translate('commands.admins.role.replies.add.has.description', interaction, {
                                user: pingUser(user),
                                role: pingRole(role)
                            }))
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
                            .setTitle(translator.translate('commands.admins.role.replies.add.error.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.role.replies.add.error.description', interaction, {
                                    role: pingRole(role),
                                    user: pingUser(user)
                                })
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
                        .setTitle(translator.translate('commands.admins.role.replies.add.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.role.replies.add.done.description', interaction, {
                            role: pingRole(role),
                            user: pingUser(user)
                        }))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'retirer') {
        const role = options.getRole('rôle', true) as Role;
        const user = options.getMember('utilisateur') as GuildMember;

        if (!checkRolePosition(role)) return;
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
                            .setTitle(translator.translate('commands.admins.role.replies.remove.hasnt.title', interaction))
                            .setDescription(translator.translate('commands.admins.role.replies.remove.hasnt.description', interaction, {
                                user: pingUser(user),
                                role: pingRole(role)
                            }))
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
                            .setTitle(translator.translate('commands.admins.role.replies.replies.remove.error.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.role.replies.remove.error.description', interaction, {
                                    user: pingUser(user),
                                    role: pingRole(role)
                                })
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
                        .setTitle(translator.translate('commands.admins.role.replies.remove.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.role.replies.remove.done.description', interaction, {
                            role: pingRole(role),
                            user: pingUser(user)
                        }))
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'accorder') {
        const role = options.getRole('rôle', true) as Role;
        const permission = options.getString('permission') as permType<'role'>;

        if (!checkRolePosition(role)) return;

        if (!(interaction.member as GuildMember).permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild,
                            lang: interaction
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
                            guild: interaction.guild,
                            lang: interaction
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
                            .setTitle(translator.translate('commands.admins.role.replies.grant.error.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.role.replies.grant.error.description', interaction, {
                                    permission: translator.translate(`contents.global.perms.role.${permission}`, interaction),
                                    role: pingRole(role)
                                })
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
                        .setTitle(translator.translate('commands.admins.role.replies.grant.granted.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.role.replies.grant.granted.description', interaction, {
                                permission: translator.translate(`contents.global.perms.role.${permission}`, interaction),
                                role: pingRole(role)
                            })
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'refuser') {
        const role = options.getRole('rôle', true) as Role;
        const permission = options.getString('permission') as permType<'role'>;

        if (!checkRolePosition(role)) return;

        if (!(interaction.member as GuildMember).permissions.has(permission))
            return interaction
                .reply({
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: [permission] },
                            guild: interaction.guild,
                            lang: interaction
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
                            guild: interaction.guild,
                            lang: interaction
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
                            .setTitle(translator.translate('commands.admins.role.replies.deny.error.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.role.replies.deny.error.description', interaction, {
                                    permission: translator.translate(`contents.global.perms.role.${permission}`, interaction),
                                    role: pingRole(role)
                                })
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
                        .setTitle(translator.translate('commands.admins.role.replies.deny.denied.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.role.replies.deny.denied.description', interaction, {
                                permission: translator.translate(`contents.global.perms.role.${permission}`, interaction),
                                role: pingRole(role)
                            })
                        )
                ]
            })
            .catch(log4js.trace);
    }
});
