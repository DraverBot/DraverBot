import {
    ButtonInteraction,
    ChannelType,
    CommandInteraction,
    EmbedBuilder,
    GuildBasedChannel,
    GuildChannel,
    MessageCreateOptions,
    TextChannel,
    User
} from 'discord.js';
import { Process } from '../structures/Process';
import { systemReply } from '../utils/toolbox';
import { log4js } from 'amethystjs';
import SendAndDelete from './SendAndDelete';
import replies from '../data/replies';

export default new Process(
    'get channel',
    async ({
        interaction,
        user,
        time = 120000,
        embed,
        channelTypes = [],
        checks = []
    }: {
        interaction: CommandInteraction | ButtonInteraction;
        user: User;
        embed: EmbedBuilder;
        time?: number;
        channelTypes?: ChannelType[];
        checks?: { check: (c: GuildBasedChannel) => boolean; reply: MessageCreateOptions }[];
    }) => {
        return new Promise<'cancel' | "time's up" | GuildChannel>(async (resolve) => {
            await systemReply(interaction, { components: [], embeds: [embed] }).catch(log4js.trace);

            const collector = interaction.channel.createMessageCollector({
                time,
                filter: (x) => x.author.id === user.id
            });

            collector.on('collect', async (message) => {
                message.delete().catch(() => {});
                if (message.content?.toLowerCase() === 'cancel') {
                    collector.stop('cancel');
                    return resolve('cancel');
                }

                const channel = (message.mentions?.channels?.first() ??
                    message.guild.channels.cache.find((x) => x?.name.toLowerCase() === message.content.toLowerCase()) ??
                    message.guild.channels.cache.get(message.content) ??
                    (/^\d{16,18}$/.test(message.content)
                        ? await message.guild.channels.fetch(message.content).catch(log4js.trace)
                        : null)) as GuildBasedChannel;

                if (!channel)
                    return SendAndDelete.process(
                        { embeds: [replies.invalidChannel(user)] },
                        message.channel as TextChannel
                    );
                if (channelTypes.length > 0 && !channelTypes.includes(channel.type))
                    return SendAndDelete.process(
                        {
                            embeds: [replies.invalidChannelType(user, channelTypes)]
                        },
                        message.channel as TextChannel
                    );
                let ok = true;
                checks.forEach((ch) => {
                    if (!ch.check(channel)) {
                        ok = false;
                        return SendAndDelete.process(ch.reply, message.channel as TextChannel);
                    }
                });
                if (!ok) return;

                collector.stop('resolved');
                return resolve(channel as GuildChannel);
            });

            collector.on('end', (_c, r) => {
                if (r === 'resolved' || r === 'cancel') return;
                return resolve("time's up");
            });
        });
    }
);
