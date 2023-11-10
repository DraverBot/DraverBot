import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js, wait } from 'amethystjs';
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { buildButton, row } from '../utils/toolbox';

type allowedImageSizes = 2048 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 4096;
const sizes = [256, 512, 1024, 2048, 4096];

export default new DraverCommand({
    name: 'avatar',
    module: 'information',
    description: "Affiche l'avatar d'un membre du serveur",
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'membre',
            description: 'Personne dont vous voulez voir la photo de profil',
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'taille',
            description: "Taille souhaitée de l'image",
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: sizes.map((size) => ({ name: `${size}x${size}`, value: size }))
        },
        {
            name: 'bannière',
            description: 'Taille de la bannière',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: sizes.map((size) => ({ name: `${size}x${size}`, value: size }))
        }
    ]
})
    .setChatInputRun(async ({ interaction, options }) => {
        const started = Date.now();
        await interaction.deferReply().catch(log4js.trace);

        const user = options.getUser('membre') ?? interaction.user;
        if (!user.banner) await user.fetch(true).catch(log4js.trace);

        if (Date.now() < started + 2000) await wait(2000 - Date.now() + started, 'ms');

        const size = (options.getInteger('taille', false) ?? 2048) as allowedImageSizes;
        const bannerSize = (options.getInteger('bannière', false) ?? 2048) as allowedImageSizes;

        const avatar = user.displayAvatarURL({ size, forceStatic: false });
        const banner = user.banner ? user.bannerURL({ size: bannerSize, forceStatic: false }) : null;

        const files = banner ? [new AttachmentBuilder(banner)] : [];

        const button = buildButton({ label: 'Ouvrir', style: 'Link', url: avatar });
        interaction
            .editReply({
                content: `Voici [l'avatar](${avatar}) de ${user.username}`,
                components: [row(button)],
                files
            })
            .catch(() => {});
    })
    .setUserContextRun(async ({ interaction, user }) => {
        const started = Date.now();
        await interaction.deferReply().catch(log4js.trace);

        if (!user.banner) await user.fetch(true).catch(log4js.trace);

        if (Date.now() < started + 2000) await wait(2000 - Date.now() + started, 'ms');

        const avatar = user.displayAvatarURL({ size: 2048, forceStatic: false });
        const banner = user.banner ? user.bannerURL({ size: 2048, forceStatic: false }) : null;

        const files = banner ? [new AttachmentBuilder(banner)] : [];

        const button = buildButton({ label: 'Ouvrir', style: 'Link', url: avatar });
        interaction
            .editReply({
                content: `Voici [l'avatar](${avatar}) de ${user.username}`,
                components: [row(button)],
                files
            })
            .catch(() => {});
    });
