import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js, waitForInteraction } from 'amethystjs';
import { basicEmbed, buildButton, random, row, waitForReplies } from '../utils/toolbox';
import replies from '../data/replies';
import { ComponentType, GuildMember, Message } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';

export default new DraverCommand({
    name: "réflexe",
    module: "fun",
    description: 'Testez vos réflexes',
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    const rep = (await interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Réflexes')
                    .setDescription(
                        `Le bouton va s'activer dans quelques secondes. Appuyez dessus le plus vite possible`
                    )
            ],
            fetchReply: true,
            components: [
                row(buildButton({ label: 'Patientez...', style: 'Primary', id: 'btn-reflex', disabled: true }))
            ]
        })
        .catch(log4js.trace)) as Message<true>;
    if (!rep)
        return interaction
            .editReply({
                embeds: [replies.internalError((interaction.member as GuildMember) ?? interaction.user)],
                components: []
            })
            .catch(log4js.trace);

    const time = random({ max: 6000, min: 2000 });

    setTimeout(async () => {
        await interaction
            .editReply({
                components: [row(buildButton({ label: 'Appuyez !', style: 'Secondary', id: 'btn-reflex' }))]
            })
            .catch(log4js.trace);

        const start = Date.now();
        const reply = await waitForInteraction({
            message: rep,
            user: interaction.user,
            replies: waitForReplies(interaction.client),
            time: 20000,
            componentType: ComponentType.Button
        });

        if (!reply)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Perdu')
                            .setDescription(`Vous avez mit plus de 20 secondes pour réagir`)
                    ],
                    components: []
                })
                .catch(log4js.trace);

        const diff = ((Date.now() - start) / 1000).toFixed(1);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Réflexologie')
                        .setDescription(`Vous avez mis \`${diff}\` secondes pour réagir`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }, time);
});
