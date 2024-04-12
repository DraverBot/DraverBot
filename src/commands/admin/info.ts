import {
    ApplicationCommandOptionType,
    CategoryChannel,
    ChannelType,
    GuildChannel,
    GuildEmoji,
    GuildMember,
    PermissionsString
} from 'discord.js';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import replies from '../../data/replies';
import { compareTwoStrings, findBestMatch } from 'string-similarity';
import {
    basicEmbed,
    boolEmoji,
    capitalize,
    displayDate,
    emptyField,
    notNull,
    pingRole,
    resizeString
} from '../../utils/toolbox';
import { channelTypeNames } from '../../data/channelTypeNames';
import { getRolePerm } from '../../utils/functions';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.info'),
    module: 'information',
    options: [
        {
            ...translator.commandData('commands.admins.info.options.emoji'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.info.options.emoji.options.emoji'),
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.info.options.channel'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.info.options.channel.options.channel'),
                    required: false,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.info.options.user'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.info.options.user.options.user'),
                    required: false,
                    type: ApplicationCommandOptionType.User
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'émoji') {
        const emojiName = options.getString('émoji');
        await Promise.all([
            interaction
                .reply({
                    embeds: [replies.wait(interaction.user, interaction)]
                })
                .catch(log4js.trace),
            interaction.guild.emojis.fetch().catch(log4js.trace)
        ]);

        const emoji = (() => {
            const first = interaction.guild.emojis.cache.get(emojiName);
            if (!!first) return first;

            const matches = findBestMatch(
                emojiName,
                interaction.guild.emojis.cache.map((x) => x.name)
            );
            const best = matches.bestMatch;
            if (best.rating >= 0.7) return interaction.guild.emojis.cache.find((x) => x.name === best.target);

            return interaction.guild.emojis.cache.find(
                (x) => x.name === emojiName || compareTwoStrings(x.name, emojiName) >= 0.85
            );
        })() as GuildEmoji;

        if (!emoji)
            return interaction
                .editReply({
                    embeds: [replies.noEmoji(interaction.member as GuildMember, interaction, emojiName)]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.info.replies.emoji.title', interaction))
                        .setFields(
                            {
                                name: translator.translate('commands.admins.info.replies.emoji.fields.name', interaction),
                                value: emoji.name,
                                inline: true
                            },
                            {
                                name: translator.translate('commands.admins.info.replies.emoji.fields.creation', interaction),
                                value: displayDate(emoji.createdTimestamp),
                                inline: true
                            },
                            {
                                name: translator.translate('commands.admins.info.replies.emoji.fields.animated', interaction),
                                value: boolEmoji(emoji.animated),
                                inline: true
                            },
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: false
                            },
                            {
                                name: translator.translate('commands.admins.info.replies.emoji.fields.id', interaction),
                                value: `\`${emoji.id}\``,
                                inline: true
                            },
                            {
                                name: translator.translate('commands.admins.info.replies.emoji.fields.mention', interaction),
                                value: `\`<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>\``,
                                inline: true
                            }
                        )
                        .setImage(emoji.url)
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'salon') {
        const channel = (options.getChannel('salon') ?? interaction.channel) as GuildChannel;

        const embed = replies
            .basicGuild(interaction.user, interaction.guild)
            .setTitle('Salon')
            .setThumbnail(
                interaction.guild?.iconURL({ forceStatic: false }) ??
                    interaction.client.user.avatarURL({ forceStatic: false })
            )
            .setFields(
                {
                    name: translator.translate('commands.admins.info.replies.channel.fields.name', interaction),
                    value: resizeString({ str: channel.name, length: 1024 }),
                    inline: true
                },
                {
                    name: translator.translate('commands.admins.info.replies.channel.fields.creation', interaction),
                    value: displayDate(channel.createdTimestamp),
                    inline: true
                },
                {
                    name: translator.translate('commands.admins.info.replies.channel.fields.type', interaction),
                    value: capitalize(translator.translate(`contents.global.channels.${channel.type}`, interaction) ?? 'N/A'),
                    inline: true
                },
                emptyField(),
                {
                    name: translator.translate('commands.admins.info.replies.channel.fields.id', interaction),
                    value: `\`${channel.id}\``,
                    inline: true
                },
                (() => {
                    if (channel.type === ChannelType.GuildCategory)
                        return {
                            name: translator.translate('commands.admins.info.replies.channel.fields.channels.name', interaction),
                            value: translator.translate('commands.admins.info.replies.channel.fields.channels.value', interaction, {
                                count: (channel as CategoryChannel).children.cache.size
                            }),
                            inline: true
                        };
                    return {
                        name: translator.translate('commands.admins.info.replies.channel.fields.parent.name', interaction),
                        value: !channel.parent ? translator.translate('commands.admins.info.replies.channel.fields.parent.none', interaction) : `${channel.parent.name}`,
                        inline: true
                    };
                })()
            );
        interaction
            .reply({
                embeds: [embed]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'utilisateur') {
        const member = (options.getMember('utilisateur') ?? interaction.member) as GuildMember;
        const user = member.user;

        const roles = member.roles.cache.filter((x) => x.id !== interaction.guild.id);

        const embed = basicEmbed(interaction.user)
            .setColor(member.displayHexColor)
            .setTitle(translator.translate('commands.admins.info.replies.user.title', interaction))
            .setFields(
                {
                    name: translator.translate('commands.admins.info.replies.user.fields.account', interaction),
                    value: displayDate(user.createdAt),
                    inline: true
                },
                {
                    name: translator.translate('commands.admins.info.replies.user.fields.join', interaction),
                    value: displayDate(member.joinedAt),
                    inline: true
                },
                {
                    name: translator.translate('commands.admins.info.replies.user.fields.nickname.name', interaction),
                    value: !!member.nickname && member.nickname !== user.username ? `\`${member.nickname}\`` : translator.translate('commands.admins.info.replies.user.fields.nickname.none', interaction),
                    inline: true
                },
                {
                    name: translator.translate('commands.admins.info.replies.user.fields.roles', interaction, { count: roles.size }),
                    value: roles.map(pingRole).slice(0, 15).join(', '),
                    inline: false
                },
                {
                    name: translator.translate('commands.admins.info.replies.user.fields.permissions.names', interaction),
                    value: member.permissions.has('Administrator')
                        ? translator.translate('commands.admins.info.replies.user.fields.permissions.admin', interaction)
                        : Object.entries(member.permissions.serialize())
                              .map(([p, h]) => (!h ? null : translator.translate(`contents.global.perms.role.${p}`, interaction)))
                              .filter(notNull)
                              .join(', ')
                }
            );

        interaction.reply({ embeds: [embed] }).catch(log4js.trace);
    }
});
