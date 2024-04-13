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
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.rewards'),
    module: 'config',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['Administrator'],
    options: [
        {
            ...translator.commandData('commands.admins.rewards.options.levels'),
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    ...translator.commandData('commands.admins.rewards.options.levels.options.list'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.rewards.options.levels.options.list.options.filter'),
                            type: ApplicationCommandOptionType.String,
                            required: false,
                            choices: [
                                {
                                    ...translator.commandData('commands.admins.rewards.options.levels.options.list.options.filter.choices.all'),
                                    value: RewardsFilter.All
                                },
                                {
                                    ...translator.commandData('commands.admins.rewards.options.levels.options.list.options.filter.choices.coins'),
                                    value: RewardsFilter.Coins
                                },
                                {
                                    ...translator.commandData('commands.admins.rewards.options.levels.options.list.options.filter.choices.roles'),
                                    value: RewardsFilter.Role
                                }
                            ]
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.rewards.options.add'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.rewards.options.add.options.level'),
                            required: true,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        },
                        {
                            ...translator.commandData('commands.admins.rewards.options.add.options.type'),
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            choices: [
                                {
                                    ...translator.commandData('commands.admins.rewards.options.add.options.type.choices.coins'),
                                    value: 'coins'
                                },
                                {
                                    ...translator.commandData('commands.admins.rewards.options.add.options.type.choices.role'),
                                    value: 'role'
                                }
                            ]
                        },
                        {
                            ...translator.commandData('commands.admins.rewards.options.add.options.role'),
                            required: false,
                            type: ApplicationCommandOptionType.Role
                        },
                        {
                            ...translator.commandData('commands.admins.rewards.options.add.options.coins'),
                            required: false,
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1
                        }
                    ]
                },
                {
                    ...translator.commandData('commands.admins.rewards.options.delete'),
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            ...translator.commandData('commands.admins.rewards.options.delete.options.reward'),
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
                    embeds: [replies.configDisabled(interaction.member as GuildMember, parameter, interaction)]
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
                            .setTitle(translator.translate('commands.admins.rewards.replies.delete.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.rewards.replies.delete.no.description', interaction))
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
                        .setTitle(translator.translate('commands.admins.rewards.replies.delete.deleted.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.rewards.replies.delete.deleted.description', interaction, {
                                level: reward.level
                            })
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
                        .setTitle(translator.translate('commands.admins.rewards.replies.list.no.title', interaction))
                        .setDescription(
                            translator.translate(`commands.admins.rewards.replies.list.no.${filter === RewardsFilter.All ? 'description' : filter === RewardsFilter.Coins ? 'coins' : 'roles'}`, interaction)
                        )
                ],
                ephemeral: true
            });

        paginatorize({
            array: rewards,
            embedFunction: () =>
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.admins.rewards.list.list.title', interaction))
                    .setDescription(
                        translator.translate('commands.admins.rewards.list.list.description', interaction, {
                            count: rewards.length
                        })
                    ),
            interaction,
            user: interaction.user,
            mapper: (embed, item) =>
                embed.addFields({
                    name: translator.translate(`commands.admins.rewards.list.list.mapper.names.${item.type}`, interaction),
                    value: translator.translate(`commands.admins.rewards.list.list.mapper.values.${item.type}`, interaction, {
                        level: item.level,
                        count: item.value,
                        role: pingRole(item?.value as string)
                    })
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
                            .setTitle(translator.translate('commands.admins.rewards.replies.add.exists.title', interaction))
                            .setDescription(
                                translator.translate(`commands.admins.rewards.replies.add.exists.description_${type}`, interaction, {
                                    level
                                })
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
                                .setTitle(translator.translate('commands.admins.rewards.replies.add.noRole.title', interaction))
                                .setDescription(translator.translate('commands.admins.rewards.replies.add.noRole.description', interaction))
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
                                .setTitle(translator.translate('commands.admins.rewards.replies.add.noCoins.title', interaction))
                                .setDescription(translator.translate('commands.admins.rewards.replies.add.noCoins.description', interaction))
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
                        .setTitle(translator.translate('commands.admins.rewards.replies.add.added.title', interaction))
                        .setDescription(translator.translate(`commands.admins.rewards.replies.add.added.description_${type}`, interaction, {
                            level
                        }))
                ]
            })
            .catch(log4js.trace);
    }
});
