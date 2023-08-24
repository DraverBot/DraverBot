import { AmethystEvent, log4js } from 'amethystjs';
import { replaceFluxVariables } from '../utils/vars';
import { AttachmentBuilder, GuildMember, TextChannel } from 'discord.js';
import { boolDb, sendError } from '../utils/toolbox';
import { loadImage, createCanvas } from 'canvas';

export default new AmethystEvent('guildMemberRemove', async (member) => {
    const guild = member.guild;

    const configs = {
        msg: guild.client.configsManager.getValue(guild.id, 'leave_message'),
        enabled: boolDb(guild.client.configsManager.getValue(guild.id, 'leave_active')),
        channel: guild.client.configsManager.getValue(guild.id, 'leave_channel')
    };

    if (!configs.enabled) return;
    const channel = guild.channels.cache.get(configs.channel as string);

    if (!channel) return;

    const msg = replaceFluxVariables({
        msg: configs.msg as string,
        member: member as GuildMember,
        guild
    });

    const attachments = [];
    const img = guild.client.configsManager.getValue(guild.id, 'leave_image') as Buffer;
    if (!!img) {
        const image = await loadImage(img).catch(log4js.trace);
        const pp = await loadImage(
            member.user.displayAvatarURL({ forceStatic: true, extension: 'jpg', size: 4096 })
        ).catch(log4js.trace);

        if (!!image && !!pp) {
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(image, 0, 0);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const avatarSize = (guild.client.configsManager.getValue(guild.id, 'leave_image_radius') as number) - 2;

            if (avatarSize > 0) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, avatarSize + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();

                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, avatarSize, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                const ppX = centerX - avatarSize;
                const ppY = centerY - avatarSize;
                const ppDiameter = avatarSize * 2;

                ctx.drawImage(pp, ppX, ppY, ppDiameter, ppDiameter);

                attachments.push(new AttachmentBuilder(canvas.toBuffer(), { name: 'leave.png' }));
            }
        }
    }

    (channel as TextChannel)
        .send({
            content: msg,
            files: attachments
        })
        .catch(sendError);
});
