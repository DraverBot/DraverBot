import { ButtonInteraction, CommandInteraction, Message, MessageCreateOptions, TextChannel, User } from 'discord.js';
import { Process } from '../structures/Process';
import { basicEmbed } from '../utils/toolbox';
import { log4js } from 'amethystjs';
import SendAndDelete from './SendAndDelete';

export default new Process(
    'get message',
    async ({
        interaction,
        user,
        allowCancel = true,
        time = 300000,
        checks = { channel: [], message: [] }
    }: {
        interaction: CommandInteraction | ButtonInteraction;
        user: User;
        allowCancel?: boolean;
        time?: number;
        checks: {
            channel?: { check: (channel: TextChannel) => boolean; reply: MessageCreateOptions }[];
            message?: { check: (message: Message) => boolean; reply: MessageCreateOptions }[];
        };
    }) => {
        return new Promise<'error' | 'cancel' | "time's up" | Message>(async (resolve) => {
            await interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Salon')
                            .setDescription(
                                `Dans quel salon se trouve le message ?\nRépondez par un **nom**, un **identifiant** ou une **mention** dans le chat.\nLe salon doit être de type textuel${
                                    allowCancel ? '\nRépondez par `cancel` pour annuler' : ''
                                }`
                            )
                    ]
                })
                .catch(log4js.trace);
            const collector = (interaction.channel as TextChannel).createMessageCollector({
                filter: (x) => x.author.id === user.id,
                time
            });

            let step: 'channel' | 'message' = 'channel' as 'channel' | 'message';
            let channel: TextChannel;

            collector.on('collect', async (msg) => {
                msg.delete().catch(log4js.trace);

                if (allowCancel && msg.content.toLowerCase() === 'cancel') return collector.stop('cancel');
                if (step === 'message') {
                    const testMsg =
                        channel.messages.cache.get(msg.content) ?? channel.messages.cache.get(msg.reference?.messageId);
                    if (!testMsg) {
                        SendAndDelete.process(
                            {
                                embeds: [
                                    basicEmbed(user, { evoker: msg.guild })
                                        .setTitle('Pas de message')
                                        .setDescription(
                                            `Le message est introuvable.\nRéeesayez avec son identifiant ou en envoyant n'importe quel message en répondant à ce message`
                                        )
                                ]
                            },
                            msg.channel as TextChannel
                        );
                        return;
                    }
                    let ok = true;
                    checks.message.forEach((c) => {
                        if (ok) {
                            if (!c.check(testMsg)) {
                                SendAndDelete.process(c.reply, msg.channel as TextChannel);
                                ok = false;
                            }
                        }
                    });
                    if (!ok) return;

                    collector.stop('resolved');
                    return resolve(testMsg);
                }
                if (step === 'channel') {
                    const testChannel =
                        (/\d{}/.test(msg.content)
                            ? await msg.guild.channels.fetch(msg.content).catch(log4js.trace)
                            : null) ??
                        msg.mentions.channels?.first() ??
                        msg.guild.channels.cache.get(msg.content) ??
                        msg.guild.channels.cache.find((x) => x.name.toLowerCase() === msg.content.toLowerCase());
                    if (!testChannel) {
                        SendAndDelete.process(
                            {
                                embeds: [
                                    basicEmbed(user, { evoker: msg.guild })
                                        .setTitle('Salon invalide')
                                        .setDescription(
                                            `Le salon n'a pas été trouvé\nRéessayez avec un nom, un identifiant ou une mention`
                                        )
                                ]
                            },
                            msg.channel as TextChannel
                        );
                        return;
                    }
                    let ok = true;
                    checks.channel.forEach((c) => {
                        if (ok) {
                            if (!c.check(testChannel as TextChannel)) {
                                ok = false;
                                SendAndDelete.process(c.reply, msg.channel as TextChannel);
                            }
                        }
                    });
                    if (!ok) return;
                    channel = testChannel as TextChannel;
                    step = 'message';
                    interaction
                        .editReply({
                            embeds: [
                                basicEmbed(user, { questionMark: true })
                                    .setTitle('Message')
                                    .setDescription(
                                        `Quel est le message que vous voulez utiliser ?\nRépondez par un identifiant${
                                            testChannel.id === msg.channel.id
                                                ? ' ou envoyez un message répondant à celui que vous voulez utiliser'
                                                : ''
                                        }${allowCancel ? '\nRépondez par `cancel` pour annuler' : ''}`
                                    )
                            ]
                        })
                        .catch(log4js.trace);
                }
            });

            collector.on('end', (_c, r) => {
                if (r === 'resolved') return;
                if (r === 'cancel') return resolve('cancel');

                return resolve("time's up");
            });
        });
    }
);
