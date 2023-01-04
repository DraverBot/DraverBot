import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, GuildMember, Role } from 'discord.js';
import { basicEmbed, evokerColor, hint, numerize, pingRole, plurial, sqliseString, subcmd } from '../utils/toolbox';
import query from '../utils/query';
import { DatabaseTables, joinRoles } from '../typings/database';

export default new AmethystCommand({
    name: 'adminjoinroles',
    description: "COnfigure les rôles d'arrivée sur le serveur",
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild', 'ManageRoles'],
    options: [
        {
            name: 'liste',
            description: "Affiche la liste des rôles d'arrivée",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'ajouter',
            description: 'Ajoute un rôle à la liste',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à ajouter',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un rôle de la liste',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rôle',
                    description: 'Rôle à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.Role
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!interaction.client.configsManager.getValue(interaction.guild.id, 'join_roles'))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setColor(evokerColor(interaction.guild))
                        .setTitle('Rôles désactivés')
                        .setDescription(
                            `Les rôles sont désactivés.\n${hint(
                                `Pour les activer, utilisez la commande \`/configurer paramètre\`, puis sélectionnez l'option \`rôles d'arrivés\``
                            )}`
                        )
                ],
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
                            .setTitle('Pas de rôles')
                            .setDescription(`Aucun rôle n'est configuré`)
                    ]
                })
                .catch(() => {});

        const list = JSON.parse(roles[0].roles) as string[];
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle("Rôles d'arrivée")
                        .setDescription(
                            `Il y a ${numerize(list.length)} rôle${plurial(list.length)} configuré${plurial(
                                list.length
                            )} :\n${list.map(pingRole).join(' ')}`
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
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Rôle trop haut')
                        .setDescription(`Le rôle est supérieur ou égal à vous dans la hiérarchie des rôles`)
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    const list = JSON.parse(roles[0]?.roles ?? '[]') as string[];
    if (cmd === 'ajouter') {
        if (list.includes(role.id))
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Rôle déjà configuré')
                            .setDescription(`Le rôle ${pingRole(role)} est déjà configuré`)
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
                        .setTitle('Rôle configuré')
                        .setDescription(`Le rôle ${pingRole(role)} sera désormais attribué aux nouveaux membres`)
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
                            .setTitle('Rôle non-configuré')
                            .setDescription(`Le rôle ${pingRole(role)} n'est pas un rôle donné aux nouveaux membres`)
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
        interaction.editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Rôle supprimé')
                    .setDescription(`Le rôle ${pingRole(role)} n'est plus donné aux nouveaux membres`)
            ]
        });
    }
});
