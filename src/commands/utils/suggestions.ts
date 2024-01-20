import { configsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember, TextChannel } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, codeBox, evokerColor, hint, pingChan } from '../../utils/toolbox';
import { util } from '../../utils/functions';

export default new DraverCommand({
    name: 'suggestion',
    module: 'utils',
    description: 'Fait une suggestion sur le serveur',
    options: [
        {
            name: 'suggestion',
            description: 'Votre suggestion',
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const channel = interaction.guild.channels.cache.get(
        configsManager.getValue(interaction.guild.id, 'suggest_channel')
    ) as TextChannel;
    if (!configsManager.getValue(interaction.guild.id, 'suggest_enable') || !channel)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Suggestions désactivées')
                        .setDescription(
                            `Le système de suggestions est désactivé.\n${
                                (interaction.member as GuildMember).permissions.has('Administrator')
                                    ? `Le salon des suggestions doit également être configuré`
                                    : `Contactez un administrateur du serveur pour configurer le système de suggestions`
                            }\n${hint(`Utilisez la commande \`/config\` pour configurer le système de suggestions`)}`
                        )
                        .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            })
            .catch(() => {});

    await interaction.deferReply();
    const res = await channel
        .send({
            embeds: [
                basicEmbed(interaction.user, { questionMark: true })
                    .setTitle('Suggestion')
                    .setDescription(
                        `Nouvelle suggestion de ${interaction.user} :\n${codeBox(options.getString('suggestion'))}`
                    )
            ]
        })
        .catch(() => {});

    interaction
        .editReply({
            embeds: [
                basicEmbed(interaction.user)
                    .setColor(res ? util('accentColor') : evokerColor(interaction.guild))
                    .setTitle(`Suggestion ${res ? 'envoyée' : 'échouée'}`)
                    .setDescription(
                        res
                            ? `Votre suggestion a été envoyée dans ${pingChan(channel)}`
                            : `La suggestion n'a pas pu être envoyée`
                    )
            ]
        })
        .catch(() => {});

    if (res) {
        for (const emoji of ['✅', '❌']) {
            await res.react(emoji).catch(() => {});
        }
        if (
            interaction.guild.members.me.permissions.has('CreatePublicThreads') &&
            configsManager.getValue(interaction.guild.id, 'suggest_thread')
        ) {
            res.startThread({
                name: options.getString('suggestion')
            }).catch(() => {});
        }
    }
});
