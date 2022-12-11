import { AmethystCommand } from "amethystjs";
import { ApplicationCommandOptionType } from "discord.js";
import { WordGenerator } from "../managers/Generator";

export default new AmethystCommand({
    name: 'generatepassword',
    description: "Génère un mot de passe aléatoire",
    options: [
        {
            name: "longueur",
            minValue: 1,
            type: ApplicationCommandOptionType.Integer,
            required: false,
            description: "Longueur en caractères de votre mot de passe",
            maxValue: 256
        },
        {
            name: 'majuscules',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
            description: "Précise si le mot de passe doit inclure des majuscules"
        },
        {
            name: 'nombres',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
            description: "Précise si le mot de passe doit inclure des nombres"
        },
        {
            name: 'spéciaux',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
            description: "Précise si le mot de passe doit inclure des caractères spéciaux"
        },
        {
            name: "additionels",
            type: ApplicationCommandOptionType.String,
            required: false,
            description: "Des caractères additionels que vous voulez ajouter dans le mot de passe"
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    const size = options.getInteger('longueur') ?? 16;
    const majuscules = options.getBoolean('majuscules') ?? true;
    const numbers = options.getBoolean('nombres') ?? true;
    const specials = options.getBoolean('spéciaux') ?? true;
    const add = options.getString('additionels') ?? '';

    const password = new WordGenerator({
        length: size,
        letters: true,
        numbers: numbers,
        overload: add,
        special: specials,
        capitals: majuscules
    }).generate();

    interaction.reply({
        content: `Voici votre mot de passe :\`\`\`${password}\`\`\``,
        ephemeral: true
    }).catch(() => {});
})