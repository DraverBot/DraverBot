import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionData, ApplicationCommandOptionType, Message } from "discord.js";
import moduleEnabled from "../preconditions/moduleEnabled";
import { basicEmbed, notNull } from "../utils/toolbox";

let opts: ApplicationCommandOptionData[] = [];
for (let i = 0; i < 10; i++) {
    opts.push({
        name: `réponse${i + 1}`,
        description: `Répones ${i + 1} au sondage`,
        type: ApplicationCommandOptionType.String,
        required: i <= 1
    });
}

export default new AmethystCommand({
    name: 'sondage',
    description: "Fait un sondage dans le salon",
    options: [
        {
            name: 'question',
            description: "Question à poser",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        ...opts
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageGuild']
}).setChatInputRun(async({ interaction, options }) => {
    const question = options.getString('question');
    const reps: string[] = options.data.filter(x => x.name !== 'question').filter(x => notNull(options.getString(x.name))).map(x => options.getString(x.name));

    const emojis = '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟'.split(' ');

    const rep = await interaction.reply({
        embeds: [ basicEmbed(interaction.user, { defaultColor: true })
            .setTitle("Sondage")
            .setDescription(`${question}\n\n${reps.map((x, i) => `${emojis[i]} ${x}`).join('\n')}`)
        ],
        fetchReply: true
    }).catch(() => {}) as Message<true>;

    if (rep) {
        emojis.splice(0, reps.length).forEach(async(emoji) => {
            await rep.react(emoji).catch(() => {});
        });
    }
})