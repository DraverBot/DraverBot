import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType } from "discord.js";
import replies from "../data/replies";
import economyCheck from "../preconditions/economyCheck";
import moduleEnabled from "../preconditions/moduleEnabled";
import { AdminLevelAddType } from "../typings/commands";
import { modActionType } from "../typings/database";
import { confirmReturn } from "../typings/functions";
import { addModLog, basicEmbed, confirm, evokerColor, numerize, plurial, random, subcmd } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'adminlevel',
    description: "Gère les niveaux du serveur",
    permissions: ['ManageGuild', 'ManageMessages'],
    preconditions: [ preconditions.GuildOnly, moduleEnabled, economyCheck ],
    options: [
        {
            name: "réinitialiser",
            description: "Réinitialise les niveaux du serveur ou d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: "Membre que vous voulez réinitialiser",
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            name: 'ajouter',
            description: "Ajoute des niveaux ou des messages à un utilisateur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'membre',
                    description: "Membre dont vous voulez ajouter des niveaux",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'type',
                    description: "Type de l'ajout que vous voulez faire",
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: 'Messages',
                            value: AdminLevelAddType.Messages
                        },
                        {
                            name: 'Niveaux',
                            value: AdminLevelAddType.Level
                        }
                    ]
                },
                {
                    name: 'montant',
                    description: "Montant de niveaux/messages que vous voulez ajouter",
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    if (!interaction.client.modulesManager.enabled(interaction.guild.id, 'level')) return interaction.reply({
        embeds: [ replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'level' })],
        ephemeral: true
    }).catch(() => {});

    const cmd = subcmd(options);

    if (cmd === 'réinitialiser') {
        const user = options.getUser('membre');
        const target = user ? `de ${user}` : 'du serveur';

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle("Réinitialisation")
                .setDescription(`Vous êtes sur le point de réinitialiser les niveaux ${target}.\nVoulez-vous continuer ?`)
        }).catch(() => {}) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value) return interaction.editReply({
            embeds: [ replies.cancel() ],
            components: []
        }).catch(() => {});

        await interaction.editReply({
            embeds: [ replies.wait(interaction.user) ],
            components: []
        });
        await interaction.client.levelsManager.reset(interaction.guild.id, user?.id);

        await addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            mod_id: interaction.user.id,
            member_id: user?.id,
            type: modActionType.LevelReset
        }).catch(() => {});

        setTimeout(() => {
            interaction.editReply({
                embeds: [ basicEmbed(interaction.user, {defaultColor: true})
                    .setTitle("Réinitialisation")
                    .setDescription(`Les niveaux ${target} ont été réinitialisés`)
                ]
            }).catch(() => {});
        }, random({ max: 6, min: 3 }) * 1000);
    }
    if (cmd === 'ajouter') {
        const user = options.getUser('membre');
        const amount = options.getInteger('montant');
        const type = options.getString('type') as AdminLevelAddType;
        const strType = type === AdminLevelAddType.Level ? 'niveau' : 'message'
        const plurialSuffix = type === AdminLevelAddType.Level ? 'x' : 's';

        const validation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle("Ajout de niveaux")
                .setDescription(`Vous êtes sur le point de rajouter **${numerize(amount)} ${strType}${plurial(amount, { plurial: plurialSuffix })}** à ${user}.\nÊtes-vous sûr ?\nVous ne pourrez pas les retirer.`)
        }).catch(() => {}) as confirmReturn;

        if (validation === 'cancel' || !validation?.value) return interaction.editReply({
            embeds: [ replies.cancel() ],
            components: []
        }).catch(() => {});

        await interaction.editReply({
            embeds: [ replies.wait(interaction.user) ],
            components: []
        }).catch(() => {});

        await interaction.client.levelsManager.addXp({
            amount,
            user_id: user.id,
            type,
            guild_id: interaction.guild.id
        });

        setTimeout(() => {
            interaction.editReply({
                embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle("Ajout de niveaux")
                    .setDescription(`${numerize(amount)} ${strType}${plurial(amount, { singular: ' a été ajouté' , plurial: plurialSuffix + ' ont été ajoutés' })} à ${user}`)
                ],
                components: []
            }).catch(() => {});
        }, random({ max: 5, min: 2 }) * 1000);
    }
})