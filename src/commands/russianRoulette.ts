import { AmethystCommand, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message } from 'discord.js';
import { yesNoRow } from '../data/buttons';
import replies from '../data/replies';
import { basicEmbed, evokerColor, random, systemReply, waitForReplies } from '../utils/toolbox';
import moduleEnabled from '../preconditions/moduleEnabled';

export default new AmethystCommand({
    name: 'roulette-russe',
    description: 'Joue à la roulette russe sur Discord',
    options: [
        {
            name: 'expulsion',
            description: 'Fait en sorte que le perdant soit expulsé du serveur',
            required: false,
            type: ApplicationCommandOptionType.Boolean
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const kick = options.getBoolean('expulsion');

    if (kick && !interaction.guild)
        return interaction
            .reply({
                embeds: [
                    replies.guildOnly(interaction.user, { guild: interaction?.guild }).addFields({
                        name: '⚠️ option',
                        value: `Vous ne pouvez pas utiliser cette commande en messages privés, car l'option d'expulsion n'est valable que dans un serveur.\nSi vous voulez jouer à la roulette russe, n'activez pas l'option \`expulsion\``,
                        inline: false
                    })
                ]
            })
            .catch(() => {});

    if (kick) {
        const msg = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user)
                    .setDescription(
                        `Vous êtes sur le point de jouer à la roulette-russe avec la possibilité de vous faire expulser.\nVoulez-vous continuer ?`
                    )
                    .setColor('Grey')
                    .setTitle('Expulsion')
            ],
            components: [yesNoRow()],
            fetchReply: true
        })) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: interaction.user,
            whoCanReact: 'useronly',
            replies: waitForReplies(interaction.client)
        });
        if (!reply || reply.customId === 'no')
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
    }

    const win = !(random({ max: 6 }) === random({ max: 6 }));

    await systemReply(interaction, {
        embeds: [
            basicEmbed(interaction.user)
                .setTitle(`Roulette russe`)
                .setDescription(
                    win
                        ? `Vous avez joué et vous avez gagné à la roulette russe${
                              kick ? `\n\n> Vous ne serez pas expulsé` : ''
                          }`
                        : `Vous avez perdu à la roulette russe${kick ? '\n\n> Vous serez expulsé dans 5 secondes' : ''}`
                )
                .setColor(win ? '#00ff00' : evokerColor(interaction.guild))
        ],
        components: []
    }).catch(() => {});
    if (kick) {
        setTimeout(() => {
            if ((interaction.member as GuildMember).kickable) {
                (interaction.member as GuildMember).kick(`Loose at russian roulette`).catch(() => {});
            }
        }, 5000);
    }
});
