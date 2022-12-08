import { AmethystCommand } from "amethystjs";
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder } from "discord.js";
import moduleEnabled from "../preconditions/moduleEnabled";
import { buildButton, row } from "../utils/toolbox";

type allowedImageSizes = 2048 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 4096
const sizes = [256, 512, 1024, 2048, 4096]

export default new AmethystCommand({
    name: 'avatar',
    description: "Affiche l'avatar d'un membre du serveur",
    preconditions: [moduleEnabled],
    options: [
        {
            name: "membre",
            description: "Personne dont vous voulez voir la photo de profil",
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: "taille",
            description: "Taille souhaitée de l'image",
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: sizes.map((size) => ({ name: `${size}x${size}`, value: size }))
        }
    ]
}).setChatInputRun(({ interaction, options }) => {
    const user = options.getUser('membre') ?? interaction.user;
    const size = (options.getInteger('taille', false) ?? 2048) as allowedImageSizes;

    const avatar = user.displayAvatarURL({ size, forceStatic: false });

    const button = buildButton({ label: 'Ouvrir', style: 'Link', url: avatar });
    interaction.reply({
        content: `Voici l'avatar de ${user.username} :\n${avatar}`,
        components: [ row(button) ]
    }).catch(() => {})
})