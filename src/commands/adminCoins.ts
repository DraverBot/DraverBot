import { AmethystCommand, preconditions, waitForInteraction } from "amethystjs";
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message } from "discord.js";
import { yesNoRow } from "../data/buttons";
import replies from "../data/replies";
import economyCheck from "../preconditions/economyCheck";
import moduleEnabled from "../preconditions/moduleEnabled";
import { modActionType } from "../typings/database";
import { util } from "../utils/functions";
import query from "../utils/query";
import { addModLog, basicEmbed, checkPerms } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'admincoins',
    description: `Gère les ${util('coins')} sur le serveur`,
    preconditions: [ preconditions.GuildOnly, moduleEnabled, economyCheck ],
    options: [
        {
            name: "réinitialiser",
            description: `Réinitialise les ${util('coins')}`,
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "utilisateur",
                    description: "Utilisateur que vous voulez réinitialiser",
                    required: false,
                    type: ApplicationCommandOptionType.User
                }
            ]
        },
        {
            name: 'ajouter',
            description: `Ajoute des ${util('coins')} à un utilisateur`,
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "utilisateur",
                    description: "Utilisateur dont vous voulez ajouter des " + util('coins'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'montant',
                    description: `Montant ${util('coinsPrefix')} que vous voulez attribuer`,
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        },
        {
            name: 'retirer',
            description: `Retire des ${util('coins')} à un utilisateur`,
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "utilisateur",
                    description: "Utilisateur dont vous voulez ajouter des " + util('coins'),
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'montant',
                    description: `Montant ${util('coinsPrefix')} que vous voulez retirer`,
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    minValue: 1
                }
            ]
        }
    ],
    permissions: ['ManageGuild']
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
            embeds: [ replies.mysqlError(interaction.user, { guild: interaction.guild }) ],
            components: []
        }).catch(() => {});

        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: user?.id ?? 'none',
            type: modActionType.CoinsReset,
            reason: "Pas de raison"
        }).catch(() => {});

        interaction.client.coinsManager.start();
        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Réinitialisation")
                .setDescription(`Les ${util('coins')} ${user ? `de ${user}` : "du serveur"} ont été réinitialisés`)
            ],
            components: []
        }).catch(() => {})
    }
    if (subcommand === 'ajouter') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const rep = await interaction.reply({
            fetchReply: true,
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle(`Ajout ${util('coinsPrefix')}`)
                    .setDescription(`Vous êtes sur le point d'ajouter **${amount.toLocaleString('fr')} ${util('coins')}** à ${user}.\nVoulez-vous continuer ?`)
                    .setColor('Grey')
            ],
            components: [ yesNoRow() ]
        }) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: rep
        });

        if (!reply || reply.customId === 'no') return interaction.editReply({
            embeds: [ replies.cancel() ],
            components: []
        });

        interaction.client.coinsManager.addCoins({
            guild_id: interaction.guild.id,
            user_id: user.id,
            coins: amount
        });

        addModLog({
            guild: interaction.guild,
            reason: "Pas de raison",
            member_id: user.id,
            mod_id: interaction.user.id,
            type: modActionType.CoinsAdd
        }).catch(() => {});

        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle(`${util('coins')} ajoutés`)
                .setDescription(`**${amount.toLocaleString('fr')} ${util('coins')}** ${amount > 1 ? 'ont été ajoutés' : 'a été ajouté'} à ${user} par ${interaction.user}`)
            ],
            components: []
        }).catch(() => {})
    }
    if (subcommand === 'retirer') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const msg = await interaction.reply({
            fetchReply: true,
            components: [ yesNoRow() ],
            embeds: [ basicEmbed(interaction.user)
                .setTitle(`Retrait ${util('coinsPrefix')}`)
                .setDescription(`Vous êtes sur le point de retirer **${amount.toLocaleString('fr')} ${util('coins')}** à ${user}.\nVoulez-vous continuer ?`)
                .setColor('Grey')
            ]
        }).catch(() => {}) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: interaction.user
        });

        if (!reply || reply.customId === 'no') return interaction.editReply({
            embeds: [replies.cancel()],
            components: []
        }).catch(() => {});

        const res = interaction.client.coinsManager.removeCoins({
            guild_id: interaction.guild.id,
            coins: amount,
            user_id: user.id
        });

        if (res === 'not enough coins') return interaction.editReply({
            embeds: [ replies.notEnoughCoins(interaction.member as GuildMember, options.getMember('utilisateur') as GuildMember) ],
            components: []
        }).catch(() => {});

        addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            mod_id: interaction.user.id,
            member_id: user.id,
            type: modActionType.CoinsRemove
        }).catch(() => {});

        interaction.editReply({
            components: [],
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle(`Retrait ${util('coinsPrefix')}`)
                .setDescription(`**${amount.toLocaleString('fr')} ${util('coins')}** ${amount > 1 ? 'ont été retirés' : 'a été retiré'} à ${user} par ${interaction.user}`)
            ]
        }).catch(() => {});
    }
})