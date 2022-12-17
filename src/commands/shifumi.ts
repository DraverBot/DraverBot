import { AmethystCommand, waitForInteraction } from "amethystjs";
import { ApplicationCommandOptionType, ComponentType, EmbedBuilder, Message } from "discord.js";
import replies from "../data/replies";
import { shifumiSign, ShifumiSigns, shifumiSigns } from "../typings/commands";
import { basicEmbed, buildButton, row } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'shifumi',
    description: "Joue au shifumi",
    options: [
        {
            name: "adversaire",
            description: "Adversaire que vous voulez affronter",
            required: false,
            type: ApplicationCommandOptionType.User
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    const user = options.getUser('adversaire');
    const btn = (sign: shifumiSign) => {
        return buildButton({
            label: sign.name,
            emoji: sign.emoji,
            style: 'Primary',
            id: sign.key
        });
    }
    const signs = row(
        btn(shifumiSigns.pierre),
        btn(shifumiSigns.feuille),
        btn(shifumiSigns.ciseaux)
    );

    const compareSigns = (one:  shifumiSign, two: shifumiSign) => {
        if (one.key === two.key) return 'e';

        const beats = {
        };
        beats[ShifumiSigns.Paper] = ShifumiSigns.Rock;
        beats[ShifumiSigns.Rock] = ShifumiSigns.Scisors;
        beats[ShifumiSigns.Scisors] = ShifumiSigns.Paper;

        if (beats[one.key] === two.key) return 'o';
        if (beats[two.key] === one.key) return 't';
        return 'e';
    }

    const embeds: Record<ReturnType<typeof compareSigns>, EmbedBuilder> = {
        e: basicEmbed(interaction.user, { defaultColor: true })
            .setTitle("")
    }
    if (!user) {
        const choiceMsg = await interaction.reply({
            embeds: [ basicEmbed(interaction.user)
                .setTitle("Signe")
                .setDescription(`Choisissez votre signe pour m'affronter dans un duel de shifumi sans pitié`)
                .setColor('Grey')
            ],
            fetchReply: true,
            components: [ signs ]
        }).catch(() => {}) as Message<true>;
        if (!choiceMsg) return;

        const choice = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: choiceMsg
        }).catch(() => {});

        if (!choice) return interaction.editReply({
            embeds: [ replies.cancel() ],
            components: []
        }).catch(() => {});

        const sign = shifumiSigns[choice.customId];
    }
})