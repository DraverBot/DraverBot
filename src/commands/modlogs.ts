import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
import replies from "../data/replies";
import validProof from "../preconditions/validProof";
import { modlogs } from "../typings/database";
import { util } from "../utils/functions";
import query from "../utils/query";
import { basicEmbed, buildButton, capitalize, dbBool, displayDate, evokerColor, mapEmbedsPaginator, paginator, row, sqliseString, updateLog } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'modlogs',
    description: "Affiche les logs du serveur",
    preconditions: [preconditions.GuildOnly, validProof],
    permissions: ['ViewAuditLog', 'ManageGuild'],
    options: [
        {
            name: 'liste',
            description: "Affiche la liste des logs",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'analyser',
            description: "Regarde un log de modération en détails",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: "Identifiant du log à regarder",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'modifier',
            description: "Modifie un log",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'identifiant',
                    description: "Identifiant du log à modifier",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'raison',
                    description: "Nouvelle raison du log",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: util('proofName'),
                    description: "Nouvelle preuve du log",
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    const subcommand = options.getSubcommand();

    if (subcommand === 'liste') {
        await interaction.deferReply();
        const datas = (await query<modlogs>(`SELECT * FROM modlogs WHERE guild_id="${interaction.guild.id}"`));

        if (datas.length === 0) return interaction.editReply({
            embeds: [ basicEmbed(interaction.user)
                .setColor(evokerColor(interaction.guild))
                .setTitle("Pas de logs")
                .setDescription(`Aucun log n'a été trouvé sur ce serveur`)
            ]
        }).catch(() => {});

        const mapEmbed = (embed: EmbedBuilder, log: modlogs) => {
            embed.addFields({
                name: log.type,
                value: `Par <@${log.mod_id}>${dbBool(log.autoMod) ? ' (Auto-modération)':''} ${displayDate(parseInt(log.date))}${log.proof ? "** - une preuve jointe**" :''}\nIdentifiant: \`${log.case_id}\``,
                inline: false
            })
        }

        if (datas.length <= 5) {
            const embed = basicEmbed(interaction.user)
                .setColor(interaction.guild.members.me.displayHexColor)
                .setTitle("Logs de modération")
                .setDescription(`**${datas.length}** log${datas.length > 1 ? 's ont':' a'} été trouvé${datas.length > 1 ? 's':''} sur ${interaction.guild.name}`)
            
            for (const log of datas) {
                mapEmbed(embed, log)
            };

            interaction.editReply({
                embeds: [ embed ]
            }).catch(() => {});
            return;
        }

        const basic = () => {
            return basicEmbed(interaction.user)
                .setTitle("Logs de modération")
                .setDescription(`**${datas.length}** log${datas.length > 1 ? 's ont':' a'} été trouvé${datas.length > 1 ? 's':''} sur ${interaction.guild.name}`)
                .setColor(interaction.guild.members.me.displayHexColor)
        }
        const embeds: EmbedBuilder[] = [basic()];
        datas.forEach((log, i) => {
            if (i % 5 === 0 && i > 0) embeds.push(basic());

            mapEmbed(embeds[i % 5], log)
        })

        paginator({
            interaction,
            embeds: mapEmbedsPaginator(embeds),
            user: interaction.user
        });
    }
    if (subcommand === 'analyser') {
        await interaction.deferReply();
        const logs = await query<modlogs>(`SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND case_id='${sqliseString(options.getString('identifiant'))}'`);

        if (logs.length === 0) return interaction.editReply({
            embeds: [ replies.unexistingLog(interaction.member as GuildMember, options.getString('identifiant')) ]
        }).catch(() => {});

        const { type, proof, mod_id, member_id, autoMod, edited, lastEditedTimestamp, deleted, reason, case_id, date } = logs[0];
        const embed = basicEmbed(interaction.user)
            .setTitle("Log de modération")
            .setDescription(`${capitalize(type)} par <@${mod_id}> (\`${mod_id}\`)${dbBool(autoMod) ? ' (auto-modération)':''} ${displayDate(parseInt(date))}${member_id !== 'none' ? ` sur <@${member_id}> ( \`${member_id}\` )` :''}`)
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
            )
        if (dbBool(deleted)) {
            embed.addFields(
                {
                    name: 'Supprimé',
                    value: "Ce log a été supprimé",
                    inline: false
                }
            )
        }
        if (dbBool(edited)) {
            embed.addFields(
                {
                    name: "Modification",
                    value: `Ce log a été modifié ${displayDate(parseInt(lastEditedTimestamp))}`,
                    inline: true
                }
            )
        }

        if (proof) {
            embed.setImage(proof);
        }

        interaction.editReply({
            embeds: [ embed ],
            components: [ row(buildButton({
                label: "Copier l'identifiant",
                style: 'Secondary',
                id: 'copyLogID'
            })) ]
        })
    }
    if (subcommand === 'modifier') {
        await interaction.deferReply();

        const identifiant = options.getString('identifiant');
        const reason = options.getString('raison');
        const proof = options.getAttachment(util('proofName'));

        if (!proof && !reason) return interaction.editReply({
            embeds: [ basicEmbed(interaction.user)
                .setTitle("Pas de modification")
                .setDescription(`Veuillez préciser une nouvelle raison ou une nouvelle preuve pour modifier un log`)
                .setColor(evokerColor(interaction.guild))
            ]
        }).catch(() => {});

        const logs = await query<modlogs>(`SELECT * FROM modlogs WHERE guild_id='${interaction.guild.id}' AND case_id="${sqliseString(identifiant)}"`);

        if (!logs || logs.length === 0) return interaction.editReply({
            embeds: [ replies.unexistingLog(interaction.member as GuildMember, identifiant) ]
        }).catch(() => {});

        if (dbBool(logs[0].deleted)) return interaction.editReply({
            embeds: [ replies.deletedLog(interaction.member as GuildMember, logs[0].case_id) ]
        }).catch(() => {});

        const res = await updateLog({
            guild: interaction.guild,
            reason,
            case_id: identifiant,
            proofURL: proof?.url
        });

        const result = basicEmbed(interaction.user)
        .setColor(res ? util('accentColor') : evokerColor(interaction.guild))
        .setTitle(res ? `Log modifié` : "Erreur de modification")
        .setDescription(res ? `Le log **${identifiant}** a été modifié.${reason ? `\nNouvelle raison : ${reason}` : ''}${proof ? `\n[Nouvelle preuve](${proof.url})` : ''}` : "Une erreur a eu lieu lors de la modification du log.\n> Essayez avec une raison plus courte");

        if (proof) result.setImage(proof.url);
        interaction.editReply({
            embeds: [ result ]
        }).catch(() => {});
    }
})