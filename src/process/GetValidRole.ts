import { Message, MessageCreateOptions, Role, TextChannel, User } from 'discord.js';
import { Process } from '../structures/Process';
import { log4js } from 'amethystjs';
import SendAndDelete from './SendAndDelete';
import { basicEmbed } from '../utils/toolbox';

type promiseReply = 'cancel' | "time's up" | Role;

export default new Process(
    'get valid role',
    ({
        message,
        user,
        allowCancel,
        time = 120000,
        checks = []
    }: {
        message: Message;
        user: User;
        allowCancel: boolean;
        time?: number;
        checks?: { check: (role: Role) => boolean; reply: MessageCreateOptions }[];
    }) => {
        return new Promise<promiseReply>(async (resolve) => {
            const collector = message.channel.createMessageCollector({
                filter: (x) => x.author.id === user.id,
                time
            });

            collector.on('collect', async (msg) => {
                msg.delete().catch(log4js.trace);
                if (allowCancel && msg.content.toLowerCase() === 'cancel') {
                    collector.stop('cancel');
                    return resolve('cancel');
                }
                const role =
                    msg.mentions.roles?.first() ??
                    msg.guild.roles.cache.get(msg.content) ??
                    msg.guild.roles.cache.find((x) => x.name.toLowerCase() === msg.content.toLowerCase());

                if (!role)
                    return SendAndDelete.process(
                        {
                            embeds: [
                                basicEmbed(msg.author, { evoker: message.guild })
                                    .setTitle('Rôle invalide')
                                    .setDescription(
                                        `Ce n'est pas un rôle valide\nRéessayez avec un **nom**, un **identifiant** ou une **mention**`
                                    )
                            ]
                        },
                        message.channel as TextChannel
                    );
                const check = () => {
                    let ok = true;

                    checks.forEach((c) => {
                        if (ok) {
                            const res = c.check(role);
                            if (!res) {
                                ok = false;
                                SendAndDelete.process(c.reply, msg.channel as TextChannel);
                            }
                        }
                    });
                    return ok;
                };
                if (!check()) return;

                collector.stop('resolved');
                return resolve(role);
            });
            collector.on('end', (_c, reason) => {
                if (reason !== 'cancel' && reason !== 'resolved') {
                    return resolve("time's up");
                }
            });
        });
    }
);
