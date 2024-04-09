import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, EmbedBuilder, GuildMember, Message } from 'discord.js';
import { yesNoRow } from '../../data/buttons';
import replies from '../../data/replies';
import validProof from '../../preconditions/validProof';
import { modActionType, modlogs } from '../../typings/database';
import { util } from '../../utils/functions';
import query from '../../utils/query';
import {
    addModLog,
    basicEmbed,
    boolDb,
    buildButton,
    capitalize,
    dbBool,
    displayDate,
    evokerColor,
    mapEmbedsPaginator,
    pagination,
    row,
    sqliseString,
    updateLog,
    waitForReplies
} from '../../utils/toolbox';
import moduleEnabled from '../../preconditions/moduleEnabled';

export default new DraverCommand({
    name: 'modlogs',
    module: 'moderation',
    description: 'Affiche les logs du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled, validProof],
    permissions: ['ViewAuditLog', 'ManageGuild'],
    options: [
        {
            name: 'liste',
            description: 'Affiche la liste des logs',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'type',
                    description: 'Type de logs que vous voulez voir',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'modérateur',
                    description: 'Affiche toutes les actions effectuées par un modérateur',
                    required: false,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'membre',
                    description: 'Affiche toutes les actions effectuées sur un membre',
                    required: false,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            name: 'analyser',
            description: 'Regarde un log de modération en détails',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du log à regarder',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'modifier',
            description: 'Modifie un log',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du log à modifier',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'raison',
                    description: 'Nouvelle raison du log',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    description: 'Nouvelle preuve du log',
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un log du serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: 'Identifiant du log à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'raison',
                    description: 'Raison de la suppression du log',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = options.getSubcommand();

    if (subcommand === 'liste') {
        await interaction.deferReply();
        const type = options.getString('type') as modActionType;
        const mod = options.getUser('modérateur');
        const member = options.getUser('membre');

        const datas = (
            await query<modlogs>(
                `SELECT * FROM modlogs WHERE guild_id="${interaction.guild.id}"${type ? ` AND type='${type}'` : ''}${
                    mod ? ` AND mod_id='${mod.id}'` : ''
                }${member ? ` AND member_id='${member.id}'` : ''}`
            )
        ).sort((a, b) => parseInt(b.date) - parseInt(a.date));

        if (datas.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle('Pas de logs')
                            .setDescription(`Aucun log n'a été trouvé sur ce serveur`)
                    ]
                })
                .catch(() => {});

        const mapEmbed = (embed: EmbedBuilder, log: modlogs) => {
            embed.addFields({
                name: modActionType[log.type],
                value: `Par <@${log.mod_id}>${dbBool(log.autoMod) ? ' (Auto-modération)' : ''} ${displayDate(
                    parseInt(log.date)
                )}${log.proof ? '** - une preuve jointe**' : ''}\nIdentifiant: \`${log.case_id}\``,
                inline: false
            });
        };

        if (datas.length <= 5) {
            const embed = basicEmbed(interaction.user)
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle('Logs de modération')
                .setDescription(
                    `**${datas.length}** log${datas.length > 1 ? 's ont' : ' a'} été trouvé${
                        datas.length > 1 ? 's' : ''
                    } sur ${interaction.guild.name}`
                );

            for (const log of datas) {
                mapEmbed(embed, log);
            }

            interaction
                .editReply({
                    embeds: [embed]
                })
                .catch(() => {});
            return;
        }

        const basic = () => {
            return basicEmbed(interaction.user)
                .setTitle('Logs de modération')
                .setDescription(
                    `**${datas.length}** log${datas.length > 1 ? 's ont' : ' a'} été trouvé${
                        datas.length > 1 ? 's' : ''
                    } sur ${interaction.guild.name}`
                )
                .setColor(interaction.guild.members.me.displayHexColor);
        };
        const embeds: EmbedBuilder[] = [basic()];
        datas.forEach((log, i) => {
            if (i % 5 === 0 && i > 0) embeds.push(basic());

            mapEmbed(embeds[embeds.length - 1], log);
        });

        pagination({
            interaction,
            embeds: mapEmbedsPaginator(embeds),
            user: interaction.user
        });
    }
    if (subcommand === 'analyser') {
        await interaction.deferReply();
        const logs = await query<modlogs>(
            `SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND case_id='${sqliseString(
                options.getString('identifiant')
            )}'`
        );

        if (logs.length === 0)
            return interaction
                .editReply({
                    embeds: [replies.unexistingLog(interaction.member as GuildMember, options.getString('identifiant'))]
                })
                .catch(() => {});

        const { type, proof, mod_id, member_id, autoMod, edited, lastEditedTimestamp, deleted, reason, case_id, date } =
            logs[0];
        const embed = basicEmbed(interaction.user)
            .setTitle('Log de modération')
            .setDescription(
                `${capitalize(modActionType[type])} par <@${mod_id}> (\`${mod_id}\`)${
                    dbBool(autoMod) ? ' (auto-modération)' : ''
                } ${displayDate(parseInt(date))}${
                    !['none', ''].includes(member_id) ? ` sur <@${member_id}> ( \`${member_id}\` )` : ''
                }`
            )
            .setColor(interaction.guild.members.me.displayHexColor)
            .setFields(
                {
                    name: 'Raison',
                    value: reason,
                    inline: true
                },
                {
                    name: 'Identifiant',
                    value: `**\`${case_id}\`**`,
                    inline: true
                }
            );
        if (dbBool(deleted)) {
            embed.addFields({
                name: 'Supprimé',
                value: 'Ce log a été supprimé',
                inline: false
            });
        }
        if (dbBool(edited)) {
            embed.addFields({
                name: 'Modification',
                value: `Ce log a été modifié ${displayDate(parseInt(lastEditedTimestamp))}`,
                inline: true
            });
        }

        if (proof) {
            embed.setImage(proof);
        }

        interaction
            .editReply({
                embeds: [embed],
                components: [
                    row(
                        buildButton({
                            label: "Copier l'identifiant",
                            style: 'Secondary',
                            id: 'copyLogID'
                        })
                    )
                ]
            })
            .catch(() => {});
    }
    if (subcommand === 'modifier') {
        await interaction.deferReply();

        const identifiant = options.getString('identifiant');
        const reason = options.getString('raison');
        const proof = options.getAttachment(util('proofName'));

        if (!proof && !reason)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de modification')
                            .setDescription(
                                `Veuillez préciser une nouvelle raison ou une nouvelle preuve pour modifier un log`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const logs = await query<modlogs>(
            `SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND case_id="${sqliseString(identifiant)}"`
        );

        if (!logs || logs.length === 0)
            return interaction
                .editReply({
                    embeds: [replies.unexistingLog(interaction.member as GuildMember, identifiant)]
                })
                .catch(() => {});

        if (dbBool(logs[0].deleted))
            return interaction
                .editReply({
                    embeds: [replies.deletedLog(interaction.member as GuildMember, logs[0].case_id)]
                })
                .catch(() => {});

        const res = await updateLog({
            guild: interaction.guild,
            reason,
            case_id: identifiant,
            proofURL: proof?.url
        });

        const result = basicEmbed(interaction.user)
            .setColor(res ? util('accentColor') : evokerColor(interaction.guild))
            .setTitle(res ? `Log modifié` : 'Erreur de modification')
            .setDescription(
                res
                    ? `Le log **${identifiant}** a été modifié.${reason ? `\nNouvelle raison : ${reason}` : ''}${
                          proof ? `\n[Nouvelle preuve](${proof.url})` : ''
                      }`
                    : 'Une erreur a eu lieu lors de la modification du log.\n> Essayez avec une raison plus courte'
            );

        if (proof) result.setImage(proof.url);
        interaction
            .editReply({
                embeds: [result]
            })
            .catch(() => {});
    }
    if (subcommand === 'supprimer') {
        if (interaction.user.id !== interaction.guild.ownerId)
            return interaction
                .reply({
                    embeds: [replies.ownerOnly(interaction.user, interaction)]
                })
                .catch(() => {});

        const msg = (await interaction.deferReply({
            fetchReply: true
        })) as Message<true>;

        const id = options.getString('identifiant');
        const reason = options.getString('raison');

        const logs = await query<modlogs>(
            `SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND case_id="${sqliseString(id)}"`
        );

        if (!logs || logs.length === 0)
            return interaction
                .editReply({
                    embeds: [replies.unexistingLog(interaction.member as GuildMember, id)]
                })
                .catch(() => {});
        const log = logs[0];

        if (dbBool(log.deleted))
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle('Log déjà supprimé')
                            .setDescription(`Le log **${id}** est déjà supprimé`)
                    ]
                })
                .catch(() => {});

        await interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Suppression')
                        .setDescription(
                            `Vous êtes sur le point de supprimer le log **\`${id}\`** pour la raison :\n${reason}\n\nÊtes-vous sûr de vouloir continuer ?`
                        )
                        .setColor('Grey')
                ],
                components: [yesNoRow()]
            })
            .catch(() => {});

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: interaction.user,
            replies: waitForReplies(interaction.client)
        }).catch(() => {});

        if (!reply || reply.customId === 'no')
            return interaction
                .editReply({
                    components: [],
                    embeds: [replies.cancel(interaction)]
                })
                .catch(() => {});

        const res = await query(`UPDATE modlogs SET deleted='${boolDb(true)}' WHERE case_id='${id}'`).catch(() => {});
        if (!res)
            return interaction
                .editReply({
                    components: [],
                    embeds: [replies.mysqlError(interaction.user, {
                        guild: interaction.guild,
                        lang: interaction
                    })]
                })
                .catch(() => {});

        interaction
            .editReply({
                components: [],
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Log supprimé')
                        .setDescription(`Le log **\`${id}\`** a été supprimé`)
                ]
            })
            .catch(() => {});

        addModLog({
            guild: interaction.guild,
            reason,
            mod_id: interaction.user.id,
            type: 'LogDeletion',
            member_id: 'none'
        }).catch(() => {});
    }
});
