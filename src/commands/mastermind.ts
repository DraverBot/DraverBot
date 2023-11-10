import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { Mastermind } from '../structures/Mastermind';
import masterminds from '../maps/masterminds';
import { basicEmbed, buildButton, row } from '../utils/toolbox';

export default new DraverCommand({
    name: "mastermind",
    module: "fun",
    description: 'Lance une partie de Mastermind',
    options: [
        {
            name: 'colonnes',
            description: 'Nombre de colonnes',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: [
                {
                    name: '4',
                    value: 4
                },
                {
                    name: '5',
                    value: 5
                }
            ]
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    if (masterminds.has(interaction.user.id))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Partie en cours')
                        .setDescription(
                            `Vous avez déjà une partie en cours\nSi vous ne pouvez plus retrouver le message, abandonnez la`
                        )
                ],
                ephemeral: true,
                components: [
                    row(buildButton({ label: 'Abandonner', style: 'Danger', buttonId: 'ResignToCurrentMastermind' }))
                ]
            })
            .catch(log4js.trace);

    const rows = (options.getInteger('colonnes') ?? 4) as 4 | 5;
    const Master = new Mastermind({
        rows,
        colors: rows === 4 ? 6 : 8,
        interaction,
        user: interaction.user,
        maxTries: 12
    });
    Master.onEnd(() => {
        masterminds.delete(interaction.user.id);
    });

    masterminds.set(interaction.user.id, Master);
});
