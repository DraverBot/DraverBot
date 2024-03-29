import { modulesManager, coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message } from 'discord.js';
import { inBank, inPocket, yesNoRow } from '../../data/buttons';
import replies from '../../data/replies';
import economyCheck from '../../preconditions/economyCheck';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { util } from '../../utils/functions';
import query from '../../utils/query';
import { addModLog, basicEmbed, confirm, numerize, row, subcmd, waitForReplies } from '../../utils/toolbox';

export default new DraverCommand({
    name: 'admincoins',
    module: 'administration',
    description: `Gère les ${util('coins')} sur le serveur`,
    preconditions: [preconditions.GuildOnly, moduleEnabled, economyCheck],
    options: [
        {
            name: 'réinitialiser',
            description: `Réinitialise les ${util('coins')}`,
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'utilisateur',
                    description: 'Utilisateur que vous voulez réinitialiser',
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
                    name: 'utilisateur',
                    description: 'Utilisateur dont vous voulez ajouter des ' + util('coins'),
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
                    name: 'utilisateur',
                    description: 'Utilisateur dont vous voulez ajouter des ' + util('coins'),
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
        },
        {
            name: 'voir',
            description: "Voir les statistiques d'un membre",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'personne',
                    description: 'Utilisateur que vous voulez voir',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        }
    ],
    permissions: ['ManageGuild']
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'economy'))
        return interaction
            .reply({
                ephemeral: true,
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'economy' })]
            })
            .catch(() => {});

    const subcommand = subcmd(options);

    if (subcommand === 'réinitialiser') {
        const user = options.getUser('utilisateur');

        const confirm = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setColor('Grey')
                    .setTitle('Réinitialisation')
                    .setDescription(
                        `Êtes-vous sûr de vouloir réinitialiser les ${util('coins')} ${
                            user ? `de ${user}` : 'du serveur'
                        } ?`
                    )
            ],
            components: [yesNoRow()],
            fetchReply: true
        })) as Message<true>;

        const rep = await waitForInteraction({
            componentType: ComponentType.Button,
            message: confirm,
            user: interaction.user,
            replies: waitForReplies(interaction.client)
        });

        if (!rep || rep.customId === 'no')
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        const res = await query(
            `DELETE FROM coins WHERE guild_id="${interaction.guild.id}"${user ? ` AND user_id="${user.id}"` : ''}`
        ).catch(() => {});

        if (!res)
            return interaction
                .editReply({
                    embeds: [replies.mysqlError(interaction.user, { guild: interaction.guild })],
                    components: []
                })
                .catch(() => {});

        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: user?.id ?? 'none',
            type: 'CoinsReset',
            reason: 'Pas de raison'
        }).catch(() => {});

        coinsManager.start();
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Réinitialisation')
                        .setDescription(
                            `Les ${util('coins')} ${user ? `de ${user}` : 'du serveur'} ont été réinitialisés`
                        )
                ],
                components: []
            })
            .catch(() => {});
    }
    if (subcommand === 'ajouter') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const place = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle('Endroit')
                    .setDescription(`Dans quelle partie voulez-vous ajouter des ${util('coins')} ?`)
                    .setColor('Grey')
            ],
            fetchReply: true,
            components: [row(inPocket(), inBank())]
        })) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: place,
            replies: waitForReplies(interaction.client)
        });

        if (!reply)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        const endroit = reply.customId === 'coins.pocket' ? 'sa poche' : 'sa banque';

        reply.deferUpdate();
        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(`Ajout ${util('coinsPrefix')}`)
                .setDescription(
                    `Vous êtes sur le point d'ajouter **${amount.toLocaleString('fr')} ${util(
                        'coins'
                    )}** à ${user} dans ${endroit}.\nVoulez-vous continuer ?`
                )
        });

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({
                embeds: [replies.cancel()],
                components: []
            });

        if (reply.customId === 'coins.pocket') {
            coinsManager.addCoins({
                guild_id: interaction.guild.id,
                user_id: user.id,
                coins: amount
            });
        } else {
            coinsManager.addBank({
                guild_id: interaction.guild.id,
                user_id: user.id,
                bank: amount
            });
        }

        addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            member_id: user.id,
            mod_id: interaction.user.id,
            type: 'CoinsAdd'
        }).catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(`${util('coins')} ajoutés`)
                        .setDescription(
                            `**${amount.toLocaleString('fr')} ${util('coins')}** ${
                                amount > 1 ? 'ont été ajoutés' : 'a été ajouté'
                            } à ${user} par ${interaction.user}`
                        )
                ],
                components: []
            })
            .catch(() => {});
    }
    if (subcommand === 'retirer') {
        const user = options.getUser('utilisateur');
        const amount = options.getInteger('montant');

        const place = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setTitle('Endroit')
                    .setDescription(`Dans quelle partie voulez-vous retirer des ${util('coins')} ?`)
                    .setColor('Grey')
            ],
            fetchReply: true,
            components: [row(inPocket(), inBank())]
        })) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: place,
            replies: waitForReplies(interaction.client)
        });

        if (!reply)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await reply.deferUpdate();
        const endroit = reply.customId === 'coins.pocket' ? 'sa poche' : 'sa banque';

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(`Ajout ${util('coinsPrefix')}`)
                .setDescription(
                    `Vous êtes sur le point de retirer **${amount.toLocaleString('fr')} ${util(
                        'coins'
                    )}** à ${user} de ${endroit}.\nVoulez-vous continuer ?`
                )
        });

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({
                embeds: [replies.cancel()],
                components: []
            });

        const selected = coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        })[reply.customId === 'coins.pocket' ? 'coins' : 'bank'];

        if (selected < amount)
            return interaction
                .editReply({
                    embeds: [
                        replies.notEnoughCoins(
                            interaction.member as GuildMember,
                            options.getMember('utilisateur') as GuildMember
                        )
                    ],
                    components: []
                })
                .catch(() => {});

        if (reply.customId === 'coins.pocket') {
            coinsManager.removeCoins({
                guild_id: interaction.guild.id,
                user_id: user.id,
                coins: amount
            });
        } else {
            coinsManager.removeBank({
                guild_id: interaction.guild.id,
                user_id: user.id,
                bank: amount
            });
        }

        addModLog({
            guild: interaction.guild,
            reason: 'Pas de raison',
            member_id: user.id,
            mod_id: interaction.user.id,
            type: 'CoinsRemove'
        }).catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(`${util('coins')} retirés`)
                        .setDescription(
                            `**${amount.toLocaleString('fr')} ${util('coins')}** ${
                                amount > 1 ? 'ont été retirés' : 'a été retiré'
                            } à ${user} par ${interaction.user}`
                        )
                ],
                components: []
            })
            .catch(() => {});
    }
    if (subcommand === 'voir') {
        const user = options.getUser('personne');
        const stats = coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: user.id
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setDescription(`Voici les statistiques de ${user}`)
                        .setTitle('Statistiques')
                        .setFields(
                            {
                                name: 'En poche',
                                value: numerize(stats.coins),
                                inline: true
                            },
                            {
                                name: 'En banque',
                                value: numerize(stats.bank),
                                inline: true
                            },
                            {
                                name: 'Total',
                                value: numerize(stats.coins + stats.bank),
                                inline: true
                            }
                        )
                ]
            })
            .catch(() => {});
    }
});
