import { configsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, GuildMember, Role } from 'discord.js';
import { basicEmbed, evokerColor, hint, numerize, pingRole, plurial, sqliseString, subcmd } from '../../utils/toolbox';
import query from '../../utils/query';
import { DatabaseTables, joinRoles } from '../../typings/database';
import { translator } from '../../translate/translate';
import replies from '../../data/replies';

export default new DraverCommand({
    ...translator.commandData('commands.admins.joinroles'),
    module: 'administration',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild', 'ManageRoles'],
    options: [
        {
            ...translator.commandData('commands.admins.joinroles.options.list'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.joinroles.options.add'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.joinroles.options.add.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.joinroles.options.remove'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.joinroles.options.remove.options.role'),
                    required: true,
                    type: ApplicationCommandOptionType.Role
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!configsManager.getValue(interaction.guild.id, 'join_roles'))
        return interaction
            .reply({
                embeds: [replies.configDisabled(interaction.member as GuildMember, 'join_roles', interaction)],
                ephemeral: true
            })
            .catch(() => {});
    const cmd = subcmd(options);
    await interaction.deferReply();

    const roles = await query<joinRoles>(
        `SELECT roles FROM ${DatabaseTables.JoinRoles} WHERE guild_id='${interaction.guild.id}'`
    );

    if (cmd === 'liste') {
        if (roles.length === 0 || roles[0]?.roles === '[]')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(
                                translator.translate('commands.admins.joinroles.replies.list.noRole.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.joinroles.replies.list.noRole.description',
                                    interaction
                                )
                            )
                    ]
                })
                .catch(() => {});

        const list = JSON.parse(roles[0].roles) as string[];
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate('commands.admins.joinroles.replies.list.list.title', interaction)
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.joinroles.replies.list.list.description',
                                interaction,
                                {
                                    count: list.length,
                                    roles: list.map(pingRole).join(' ')
                                }
                            )
                        )
                ]
            })
            .catch(() => {});
        return;
    }

    const role = options.getRole('rôle') as Role;
    if (role.position >= (interaction.member as GuildMember).roles.highest.position)
        return interaction
            .editReply({
                embeds: [replies.roleTooHigh(interaction.member as GuildMember, role, interaction)]
            })
            .catch(() => {});

    const list = JSON.parse(roles[0]?.roles ?? '[]') as string[];
    if (cmd === 'ajouter') {
        if (list.includes(role.id))
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate(
                                    'commands.admins.joinroles.replies.add.alreadyConfigured.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.joinroles.replies.add.alradyConfigured.description',
                                    interaction,
                                    { role: pingRole(role) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        list.push(role.id);
        await query(
            `REPLACE INTO ${DatabaseTables.JoinRoles} ( guild_id, roles ) VALUES ("${
                interaction.guild.id
            }", "${sqliseString(JSON.stringify(list))}")`
        );

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate('commands.admins.joinroles.replies.add.configured.title', interaction)
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.joinroles.replies.add.configured.description',
                                interaction,
                                { role: pingRole(role) }
                            )
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'supprimer') {
        if (!list.includes(role.id))
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate(
                                    'commands.admins.joinroles.replies.remove.notConfigured.title',
                                    interaction
                                )
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.joinroles.replies.remove.notConfigured.description',
                                    interaction,
                                    { role: pingRole(role) }
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const index = list.indexOf(role.id);
        list.splice(index, 1);

        await query(
            `REPLACE INTO ${DatabaseTables.JoinRoles} ( guild_id, roles ) VALUES ("${
                interaction.guild.id
            }", "${sqliseString(JSON.stringify(list))}")`
        );
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(
                            translator.translate(
                                'commands.admins.joinroles.replies.remove.configured.title',
                                interaction
                            )
                        )
                        .setDescription(
                            translator.translate(
                                'commands.admins.joinroles.replies.remove.configured.description',
                                interaction,
                                { role: pingRole(role) }
                            )
                        )
                ]
            })
            .catch(log4js.trace);
    }
});
