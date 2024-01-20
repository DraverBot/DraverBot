import { DraverCommand } from '../../structures/DraverCommand';
import { log4js } from 'amethystjs';
import { ApplicationCommandOptionType, ColorResolvable, GuildMember } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, hexToRgb, isValidHexColor, random } from '../../utils/toolbox';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'couleur',
    module: 'utils',
    description: 'Montre une couleur',
    options: [
        {
            name: 'couleur',
            required: false,
            type: ApplicationCommandOptionType.String,
            description: 'La couleur que vous voulez voir'
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const randomColor = () => {
        const chars = ['0', '1', '2', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        let x = '#';

        for (let i = 0; i < 6; i++) {
            x += chars[random({ max: chars.length })];
        }

        return x as ColorResolvable;
    };
    const formatColor = (color: string | ColorResolvable) => {
        let x = color.toString().replace('#', '');
        if (x.length === 3) {
            x = x.replace(/(.)/g, '$1$1');
        }

        return `#${x}`;
    };
    const color = options.getString('couleur') ?? randomColor();

    if (!isValidHexColor(color.toString()))
        return interaction
            .reply({
                embeds: [replies.invalidColor((interaction.member as GuildMember) ?? interaction.user)],
                ephemeral: true
            })
            .catch(log4js.trace);

    const { r: red, g: green, b: blue } = hexToRgb(formatColor(color));
    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setColor(color as ColorResolvable)
                    .setThumbnail(
                        `https://dummyimage.com/600x400/${formatColor(color).replace('#', '')}/000000.png&text=++`
                    )
                    .setFields(
                        {
                            name: 'Hexadécimal',
                            value: `\`${formatColor(color)}\``,
                            inline: true
                        },
                        {
                            name: 'Rgb',
                            value: `\`(${red}, ${green}, ${blue})\``,
                            inline: true
                        }
                    )
            ]
        })
        .catch(log4js.trace);
});
