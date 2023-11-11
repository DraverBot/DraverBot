import { log4js } from 'amethystjs';
import { ApplicationCommandOptionType, AttachmentBuilder, ImageSize } from 'discord.js';
import replies from '../data/replies';
import { cardAvatarList, getRandomImagePath } from '../utils/christmas';
import { cardAvatarPos } from '../typings/christmas';
import { createCanvas, loadImage } from 'canvas';
import { basicEmbed } from '../utils/toolbox';
import { DraverCommand } from '../structures/DraverCommand';

export default new DraverCommand({
    name: 'carte',
    description: 'Fabrique une carte de noël',
    module: 'fun',
    options: [
        {
            name: 'image',
            description: "Taille de l'image",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: 'Carré',
                    value: '1024/1024'
                },
                {
                    name: 'Paysage',
                    value: '1344/768'
                }
            ]
        },
        {
            name: 'utilisateur',
            description: 'Utilisateur qui apparaitra sur la carte',
            required: false,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'avatar',
            description: "Position de l'avatar",
            required: false,
            type: ApplicationCommandOptionType.String,
            choices: cardAvatarList()
        },
        {
            name: 'taille',
            description: "Taille de l'avatar",
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: [
                {
                    name: '256x256',
                    value: 256
                },
                {
                    name: '512x512',
                    value: 512
                }
            ]
        },
        {
            name: 'titre',
            description: 'Titre de la carte',
            required: false,
            type: ApplicationCommandOptionType.String,
            maxLength: 20
        },
        {
            name: 'description',
            description: 'Sous-titre de la carte',
            required: false,
            type: ApplicationCommandOptionType.String,
            maxLength: 35
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const imgType = options.getString('image');
    const user = options.getUser('utilisateur') ?? interaction.user;
    const cardPos = (options.getString('avatar') ?? cardAvatarPos.Center) as cardAvatarPos;
    const radius = (options.getInteger('taille') ?? 256) / 2;
    const title = options.getString('titre') ?? 'Joyeux noël';
    const subtitle = options.getString('description');

    await interaction
        .reply({
            embeds: [replies.wait(interaction.user)]
        })
        .catch(log4js.trace);

    const img = getRandomImagePath(imgType);
    const [image, avatar] = await Promise.all([
        loadImage(img).catch(log4js.trace),
        loadImage(
            user.displayAvatarURL({ forceStatic: true, extension: 'jpg', size: (radius * 2) as ImageSize })
        ).catch(log4js.trace)
    ]);

    if (!image || !avatar)
        return interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle("Erreur d'image")
                        .setDescription(`Je n'ai pas réussi à charger l'image correctement. Veuillez réessayer`)
                ]
            })
            .catch(log4js.trace);

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);

    const determinePosition = (): [number, number] => {
        const map = {
            left: (radius * 2) / image.width,
            right: (image.width - radius * 2) / image.width,
            middle: 0.5,
            top: (radius * 2) / image.height,
            bottom: (image.height - radius * 2) / image.height
        };
        return cardPos
            .split(' ')
            .map((x, i) => [image.height, image.width][i] * map[x])
            .reverse() as [number, number];
    };
    const determineTextPosition = (): [number, number] => {
        const multiplicator = 2.3;
        const map = {
            left: image.width - radius * multiplicator,
            right: radius * multiplicator,
            top: image.height - radius * multiplicator,
            bottom: radius * multiplicator
        };
        return cardPos
            .split(' ')
            .map((x, i) => (x === 'middle' ? (i === 0 ? image.height : image.width) / 2 : map[x]))
            .reverse() as [number, number];
    };

    const drawAvatar = () => {
        const [avX, avY] = determinePosition();

        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(avX, avY, radius + 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(avX, avY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, avX - radius, avY - radius);
    };
    const drawText = () => {
        const textSize = 60;
        const police = 'coolvetica';
        ctx.font = `${textSize}px ${police}`;
        ctx.fillStyle = 'red';

        const [x, y] = determineTextPosition();

        ctx.textAlign = 'center';
        ctx.fillText(title, x, y);

        if (!!subtitle) {
            ctx.font = `${textSize - 4}px ${police}`;
            ctx.fillStyle = 'black';
            ctx.fillText(subtitle, x, y + textSize * 1.1 * (cardPos.split(' ')[0] === 'bottom' ? -1 : 1));
        }
    };

    drawText();
    drawAvatar();

    interaction
        .editReply({
            embeds: [],
            content: `Voici votre carte de noël`,
            files: [
                new AttachmentBuilder(canvas.toBuffer('image/jpeg'))
                    .setName('card.jpg')
                    .setDescription('Une carte de noël')
            ]
        })
        .catch(log4js.trace);
});
