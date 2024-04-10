import { Attachment, CommandInteraction, EmbedBuilder, TextChannel, User } from 'discord.js';
import { Process } from '../structures/Process';
import replies from '../data/replies';
import { sendError, systemReply } from '../utils/toolbox';
import { log4js } from 'amethystjs';
import SendAndDelete from './SendAndDelete';
import { get } from 'https';

export default new Process(
    'get image',
    async ({
        interaction,
        user,
        width = 1100,
        height = 700,
        embed = replies.askImage(user, { width, height }, interaction),
        time = 120000
    }: {
        interaction: CommandInteraction;
        embed?: EmbedBuilder;
        user: User;
        width?: number;
        height?: number;
        time?: number;
    }): Promise<(Attachment & { buffer: Buffer }) | 'cancel'> => {
        return new Promise(async (resolve) => {
            await systemReply(interaction, { embeds: [embed], components: [] }).catch(log4js.trace);
            const rep = await interaction.fetchReply().catch(log4js.trace);

            if (!rep) return resolve('cancel');

            const collector = rep.channel.createMessageCollector({
                time,
                filter: (x) => x.author.id === user.id
            });

            let image;
            collector.on('collect', async (msg) => {
                msg.delete().catch(log4js.trace);
                if (msg.content.toLowerCase() === 'cancel') {
                    return collector.stop('cancel');
                }

                const validImg = /(jpe?g|png|webp)/;
                if (!msg.attachments.filter((x) => validImg.test(x.contentType)).size) {
                    SendAndDelete.process(
                        { embeds: [replies.noImage(msg.member ?? msg.author, interaction)] },
                        msg.channel as TextChannel
                    );
                    return;
                }
                const img = msg.attachments.first();
                if (img.size > 1000000) {
                    SendAndDelete.process(
                        { embeds: [replies.imageTooLarge(msg.member ?? msg.author, interaction)] },
                        msg.channel as TextChannel
                    );
                    return;
                }
                if (img.width > width || img.height > height) {
                    SendAndDelete.process(
                        { embeds: [replies.invalidDimens(msg.member ?? msg.author, { width, height }, interaction)] },
                        msg.channel as TextChannel
                    );
                    return;
                }
                image = img;
                collector.stop('done');
            });

            collector.on('end', (c, r) => {
                if (r != 'done') {
                    return resolve('cancel');
                }
                if (r === 'done') {
                    get(image.url, (res) => {
                        const data = [];

                        res.on('data', (chunk) => {
                            data.push(chunk);
                        });
                        res.on('end', () => {
                            const buffer = Buffer.concat(data);
                            resolve({
                                ...image,
                                buffer
                            });
                        });
                        res.on('error', (err) => {
                            sendError(`Erreur lors de la récupération d'une image, pendant le get de https`);
                            sendError(err);
                            resolve('cancel');
                        });
                    });
                }
            });
        });
    }
);
