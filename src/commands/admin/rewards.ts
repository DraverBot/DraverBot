import { modulesManager, configsManager, rewards as rewardsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, GuildMember, Role } from 'discord.js';
import { RewardsFilter } from '../../typings/commands';
import { util } from '../../utils/functions';
import {
    addModLog,
    basicEmbed,
    checkRolePosition,
    numerize,
    paginatorize,
    pingRole,
    plurial
} from '../../utils/toolbox';
import { configKeys } from '../../data/configData';
import replies from '../../data/replies';
import { levelRewardType } from '../../typings/database';

export default new DraverCommand({
    name: 'récompenses',
    module: 'config',
    description: 'Gère les récompenses du serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    options: [
        {
            name: 'niveaux',
            description: 'Gère les récompenses de niveau',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'liste',
                    description: 'Affiche la liste des récompenses de niveau',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'filtre',
                            description: 'Filtre les récompenses',
                            type: ApplicationCommandOptionType.String,
                            required: false,
                            choices: [
                                {
                                    name: 'Toutes',
                                    value: RewardsFilter.All
                                },
                                {
                                    name: util('coins'),
                                    value: RewardsFilter.Coins
                                },
                                {
                                    name: 'Rôles',
                                    value: RewardsFilter.Role
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'ajouter',
                    description: 'Ajoute une récompense de niveau',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'niveau',
                            description: 'Niveau auquel la récompense est attribuée',
                            required: true,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        },
                        {
                            name: 'type',
                            description: 'Type de la récompense',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            choices: [
                                {
                                    name: util('coins'),
                                    value: 'coins'
                                },
                                {
                                    name: 'Rôle',
                                    value: 'role'
                                }
                            ]
                        },
                        {
                            name: 'rôle',
                            description: 'Rôle que vous voulez donner',
                            required: false,
                            type: ApplicationCommandOptionType.Role
                        },
                        {
                            name: util<string>('coins').toLowerCase(),
                            description: `Nombre ${util('coinsPrefix')} que vous voulez donner`,
                            required: false,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        }
                    ]
                },
                {
                    name: 'supprimer',
                    description: 'Supprime une récompense de niveau',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'récompense',
                            description: 'Récompense que vous voulez supprimer',
                            required: true,
                            autocomplete: true,
                            type: ApplicationCommandOptionType.String
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    const check = (parameter: keyof configKeys) => {
        if (!configsManager.getValue(interaction.guild.id, parameter)) {
            interaction
                .reply({
                    ephemeral: true,
                    embeds: [replies.configDisabled(interaction.member as GuildMember, parameter)]
                })
                .catch(log4js.trace);
            return false;
        }
        return true;
    };
    if (cmd === 'supprimer') {
        if (!check('level_rewards')) return;
        if (!modulesManager.enabled(interaction.guild.id, 'level'))
            return interaction
                .reply({
                    embeds: [
                        replies.moduleDisabled(interaction.user, {
                            guild: interaction.guild,
                            module: 'level',
                            lang: interaction
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const reward = rewardsManager.getReward(parseInt(options.getString('récompense')));
        if (!reward)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Aucune récompense')
                            .setDescription(`Aucune récompense n'a été trouvée`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        rewardsManager.removeReward(reward.id);

        addModLog({
            guild: interaction.guild,
            reason: `Suppression de la récompense de niveau ${reward.level} ( ${
                reward.type === 'role'
                    ? pingRole(reward.value as string)
                    : `${numerize(reward.value as number)} ${util('coins')}`
            } )`,
            type: 'DeleteReward',
            mod_id: interaction.user.id,
            member_id: ''
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Récompense supprimée')
                        .setDescription(
                            `La récompense de niveau **${numerize(reward.level)}** de type **${
                                reward.type === 'coins' ? util('coins') : 'rôle'
                            }** a été supprimée`
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'liste') {
        if (!check('level_rewards')) return;
        if (!modulesManager.enabled(interaction.guild.id, 'level'))
            return interaction
                .reply({
                    embeds: [
                        replies.moduleDisabled(interaction.user, {
                            guild: interaction.guild,
                            module: 'level',
                            lang: interaction
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const filter = (options.getString('filtre') ?? RewardsFilter.All) as RewardsFilter;
        const rewards = rewardsManager
            .getRewards(interaction.guild)
            .filter((x) =>
                filter === RewardsFilter.All ? true : x.type === (filter === RewardsFilter.Coins ? 'coins' : 'role')
            );

        if (!rewards.length)
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Pas de récompenses')
                        .setDescription(
                            `Aucune récompense de niveau${
                                filter === RewardsFilter.All
                                    ? ''
                                    : ` de ${filter === RewardsFilter.Coins ? util('coins') : 'rôle'}`
                            } n'est définie`
                        )
                ],
                ephemeral: true
            });

        paginatorize({
            array: rewards,
            embedFunction: () =>
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Récompenses de niveaux')
                    .setDescription(
                        `**${numerize(rewards.length)}** récompense${plurial(rewards)} de niveaux ${plurial(rewards, {
                            singular: 'est configurée',
                            plurial: 'sont configurées'
                        })}`
                    ),
            interaction,
            user: interaction.user,
            mapper: (embed, item) =>
                embed.addFields({
                    name: item.type === 'coins' ? util('coins') : 'Rôle',
                    value: `Au niveau **${numerize(item.level)}**\n> ${
                        item.type === 'coins'
                            ? `**${numerize(item.value as number)}** ${util('coins')}`
                            : `${pingRole(item.value as string)}`
                    }`
                })
        });
    }
    if (cmd === 'ajouter') {
        if (!check('level_rewards')) return;
        if (!modulesManager.enabled(interaction.guild.id, 'level'))
            return interaction
                .reply({
                    embeds: [
                        replies.moduleDisabled(interaction.user, {
                            guild: interaction.guild,
                            module: 'level',
                            lang: interaction
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const level = options.getInteger('niveau');
        const type = options.getString('type') as levelRewardType;
        const typeText = type === 'coins' ? util('coinsPrefix') : 'de rôle';
        const role = options.getRole('rôle');
        const coins = options.getInteger(util<string>('coins').toLowerCase());

        const rewards = rewardsManager.getRewards(interaction);

        if (rewards.find((x) => x.level === level && x.type === type))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Récompense déjà définie')
                            .setDescription(
                                `Une récompense ${typeText} a déjà été configurée au niveau ${numerize(level)}`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        if (type === 'role') {
            if (!role)
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { evoker: interaction.guild })
                                .setTitle('Pas de rôle')
                                .setDescription(`Vous n'avez pas précisé de rôle`)
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
            if (
                !checkRolePosition({
                    respond: true,
                    interaction,
                    member: interaction.member as GuildMember,
                    role: role as Role,
                    ephemeral: true
                })
            )
                return;
        } else {
            if (!modulesManager.enabled(interaction.guild.id, 'economy'))
                return interaction
                    .reply({
                        embeds: [
                            replies.moduleDisabled(interaction.user, {
                                guild: interaction.guild,
                                module: 'economy',
                                lang: interaction
                            })
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
            if (!coins)
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { evoker: interaction.guild })
                                .setTitle(`Pas ${util('coinsPrefix')}`)
                                .setDescription(`Vous n'avez pas précisé ${util('coinsPrefix')}`)
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
        }

        await interaction
            .reply({
                embeds: [replies.wait(interaction.user, interaction)]
            })
            .catch(log4js.trace);

        const res = await rewardsManager.addReward({
            guild: interaction.guild,
            type,
            value: type === 'coins' ? coins : role.id,
            level
        });

        if (!res || res === 'not found')
            return interaction
                .editReply({
                    embeds: [replies.mysqlError(interaction.user, { guild: interaction.guild, lang: interaction })]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Récompense ajoutée')
                        .setDescription(`Une récompense ${typeText} au niveau ${numerize(level)} a été créée`)
                ]
            })
            .catch(log4js.trace);
    }
});
