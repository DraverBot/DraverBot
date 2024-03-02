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

export default new DraverCommand({
    name: 'info',
    description: 'Affiche des informations',
    module: 'information',
    options: [
        {
            name: 'émoji',
            description: "Affiche les informations d'un émoji",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'émoji',
                    description: 'Émoji que vous voulez voir',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'salon',
            description: "Affiche les informations d'un salon",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon dont vous voulez voir les informations',
                    required: false,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
        {
            name: 'utilisateur',
            description: "Affiche les informations d'un utilisateur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'utilisateur',
                    description: 'Utilisateur dont vous voulez voir les informations',
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
                    embeds: [replies.wait(interaction.user)]
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
                    embeds: [replies.noEmoji(interaction.member as GuildMember, emojiName)]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Émoji')
                        .setFields(
                            {
                                name: 'Nom',
                                value: emoji.name,
                                inline: true
                            },
                            {
                                name: 'Création',
                                value: displayDate(emoji.createdTimestamp),
                                inline: true
                            },
                            {
                                name: 'Animé',
                                value: boolEmoji(emoji.animated),
                                inline: true
                            },
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: false
                            },
                            {
                                name: 'Identifiant',
                                value: `\`${emoji.id}\``,
                                inline: true
                            },
                            {
                                name: `Mention`,
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
                    name: 'Nom',
                    value: resizeString({ str: channel.name, length: 1024 }),
                    inline: true
                },
                {
                    name: 'Création',
                    value: displayDate(channel.createdTimestamp),
                    inline: true
                },
                {
                    name: 'Type',
                    value: capitalize(channelTypeNames[ChannelType[channel.type]] ?? 'No type name'),
                    inline: true
                },
                emptyField(),
                {
                    name: 'Identifiant',
                    value: `\`${channel.id}\``,
                    inline: true
                },
                (() => {
                    if (channel.type === ChannelType.GuildCategory)
                        return {
                            name: 'Nombre de salons',
                            value: (channel as CategoryChannel).children.cache.size.toLocaleString(interaction.locale),
                            inline: true
                        };
                    return {
                        name: 'Catégorie',
                        value: !channel.parent ? 'Pas de catégorie' : `${channel.parent.name}`,
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
            .setTitle('Utilisateur')
            .setFields(
                {
                    name: 'Création du compte',
                    value: displayDate(user.createdAt),
                    inline: true
                },
                {
                    name: "Date d'arrivée",
                    value: displayDate(member.joinedAt),
                    inline: true
                },
                {
                    name: 'Pseudo',
                    value: !!member.nickname && member.nickname !== user.username ? `\`${member.nickname}\`` : 'Aucun',
                    inline: true
                },
                {
                    name: `Rôles ( ${roles.size.toLocaleString()} )`,
                    value: roles.map(pingRole).slice(0, 15).join(', '),
                    inline: false
                },
                {
                    name: 'Permissions',
                    value: member.permissions.has('Administrator')
                        ? 'Administrateur'
                        : Object.entries(member.permissions.serialize())
                              .map(([p, h]) => (!h ? null : getRolePerm(p as PermissionsString)))
                              .filter(notNull)
                              .join(', ')
                }
            );

        interaction.reply({ embeds: [embed] }).catch(log4js.trace);
    }
});
