import { GuildMember, TextChannel, User } from 'discord.js';
import { Process } from '../structures/Process';
import { log4js } from 'amethystjs';
import SendAndDelete from './SendAndDelete';
import replies from '../data/replies';
import { langResolvable } from '../typings/core';

export default new Process(
    'Get emoji',
    async ({
        user,
        channel,
        allowCancel = false,
        time = 120000,
        lang
    }: {
        user: User;
        channel: TextChannel;
        time?: number;
        allowCancel: boolean;
        lang: langResolvable;
    }) => {
        return new Promise<'cancel' | "time's up" | string>(async (resolve) => {
            const collector = channel.createMessageCollector({
                filter: (x) => x.author.id === user.id,
                time
            });

            collector.on('collect', async (message) => {
                message.delete().catch(log4js.trace);
                if (allowCancel && message.content?.toLowerCase() === 'cancel') {
                    collector.stop('cancel');
                    return resolve('cancel');
                }

                const valid =
                    /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(message.content) ||
                    !!message.client.emojis.cache.get(message.content) ||
                    !!message.client.emojis.cache.find((x) => x.toString() === message.content);
                if (!valid) {
                    SendAndDelete.process(
                        { embeds: [replies.invalidEmoji((message.member as GuildMember) ?? message.author, lang)] },
                        message.channel as TextChannel
                    );
                    return;
                }

                const emoji =
                    message.client.emojis.cache.get(message.content) ??
                    message.client.emojis.cache.find((x) => x.toString() === message.content) ??
                    message.content;
                resolve(emoji.toString());
                collector.stop('resolved');
                return;
            });
            collector.on('end', (_c, r) => {
                if (r !== 'cancel' && r !== 'resolved') return resolve("time's up");
            });
        });
    }
);
