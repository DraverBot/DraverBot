import { configsManager, GBan } from '../cache/managers';
import { AmethystEvent, log4js } from 'amethystjs';
import { replaceFluxVariables } from '../utils/vars';
import { AttachmentBuilder, TextChannel } from 'discord.js';
import query from '../utils/query';
import { DatabaseTables, joinRoles } from '../typings/database';
import { addModLog, basicEmbed, evokerColor, sendError } from '../utils/toolbox';
import { createCanvas, loadImage } from 'canvas';

export default new AmethystEvent('guildMemberAdd', async (member) => {
    const guild = member.guild;

    const configs = {
        msg: configsManager.getValue(guild.id, 'join_message'),
        enabled: configsManager.getValue(guild.id, 'join_active'),
        channel: configsManager.getValue(guild.id, 'join_channel'),
        roles: configsManager.getValue(member.guild.id, 'join_roles'),
        gban: configsManager.getValue(guild.id, 'gban'),
        gbanAction: configsManager.getValue(guild.id, 'gban_ban') ? 'ban' : 'kick'
    };

    if (configs.gban && GBan.isGbanned(member.id)) {
        await member
            .send({
                embeds: [
                    basicEmbed(member.user)
                        .setTitle('🚫 GBanni')
                        .setDescription(
                            `Vous êtes **GBanni** de Draver, ce qui signifie que vous ne pouvez rejoindre aucun serveur dont le système est activé.\nVous avez donc été ${
                                configs.gbanAction === 'ban' ? 'banni' : 'expulsé'
                            } de ${member.guild.name}.`
                        )
                        .setColor(evokerColor(member.guild))
                ]
            })
            .catch(() => {});

        if (configs.gbanAction === 'ban') {
            member
                .ban({
                    reason: `Utilisateur GBanni`
                })
                .catch(() => {});
        } else {
            await member.kick(`Membre GBanni`).catch(() => {});
        }

        addModLog({
            guild: member.guild,
            member_id: member.id,
            mod_id: member.client.user.id,
            reason: `Utilisateur GBanni`,
            type: 'Ban'
        }).catch(() => {});
    }
    if (configs.roles && !member.user.bot) {
        const roles = await query<joinRoles>(
            `SELECT roles FROM ${DatabaseTables.JoinRoles} WHERE guild_id='${member.guild.id}'`
        );

        if (roles.length > 0) {
            const list = JSON.parse(roles[0].roles) as string[];
            await member.guild.roles.fetch();

            const rolesList = member.guild.roles.cache.filter((x) => list.includes(x.id));
            member.roles.add(rolesList).catch(sendError);
        }
    }

    if (!configs.enabled) return;
    const channel = guild.channels.cache.get(configs.channel as string);

    if (!channel) return;

    const msg = replaceFluxVariables({
        msg: configs.msg as string,
        member,
        guild
    });
    const attachments = [];
    const img = configsManager.getValue(guild.id, 'welcome_image') as Buffer;
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
            const avatarSize = (configsManager.getValue(guild.id, 'welcome_image_radius') as number) - 2;

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

                attachments.push(new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' }));
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
