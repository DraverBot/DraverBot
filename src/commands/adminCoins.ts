import { AmethystCommand, preconditions, waitForInteraction } from "amethystjs";
import { ApplicationCommandOptionType, ComponentType, Message } from "discord.js";
import { yesNoRow } from "../data/buttons";
import replies from "../data/replies";
import moduleEnabled from "../preconditions/moduleEnabled";
import { util } from "../utils/functions";
import query from "../utils/query";
import { basicEmbed } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'admincoins',
    description: `Gère les ${util('coins')} sur le serveur`,
    preconditions: [ preconditions.GuildOnly, moduleEnabled ],
    options: [
        {
            name: "réinitialiser",
            description: `Réinitialise les ${util('coins')}`,
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "utilisateur",
                    description: "Utilisateur que vous voulez réinitialiser",
                    required: true,
                    type: ApplicationCommandOptionType.User
                }
            ]
        }
    ]
})
.setChatInputRun(async({ interaction, options }) => {
    const subcommand = options.getSubcommand();

    if (subcommand === 'réinitialiser') {
        const user = options.getUser('utilisateur');

        const confirm = await interaction.reply({
            embeds: [ basicEmbed(interaction.user)
                .setColor('Grey')
                .setTitle("Réinitialisation")
                .setDescription(`Êtes-vous sûr de vouloir réinitialiser les ${util('coins')} ${user ? `de ${user}` : 'du serveur'} ?`)
            ],
            components: [ yesNoRow() ],
            fetchReply: true
        }) as Message<true>;

        const rep = await waitForInteraction({
            componentType: ComponentType.Button,
            message: confirm,
            user: interaction.user
        });

        if (!rep || rep.customId === 'no') return interaction.editReply({
            embeds: [ replies.cancel() ],
            components: []
        }).catch(() => {});

        const res = await query(`DELETE FROM coins WHERE guild_id="${interaction.guild.id}"${user ? ` AND user_id="${user.id}"`:''}`).catch(() => {});

        if (!res) return interaction.editReply({
            embeds: [ replies.mysqlError(interaction.user, { guild: interaction.guild }) ]
        })
    }
})