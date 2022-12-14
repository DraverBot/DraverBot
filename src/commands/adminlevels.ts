import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType } from "discord.js";
import replies from "../data/replies";
import economyCheck from "../preconditions/economyCheck";
import moduleEnabled from "../preconditions/moduleEnabled";
import { modActionType } from "../typings/database";
import { confirmReturn } from "../typings/functions";
import { addModLog, basicEmbed, confirm, random, subcmd } from "../utils/toolbox";

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
})