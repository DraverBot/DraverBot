import { invitesManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed, numerize, pingUser, plurial } from '../../utils/toolbox';

export default new DraverCommand({
    name: 'invitations',
    module: 'invitations',
    description: "Affiche les invitations d'un membre",
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'utilisateur',
            description: 'Utilisateur dont vous voulez voir les invitations',
            required: false,
            type: ApplicationCommandOptionType.User
        }
    ]
}).setChatInputRun(async ({ interaction, options, client }) => {
    const user = options.getUser('utilisateur') ?? interaction.user;

    const stats = invitesManager.getStats(interaction.guild.id, user.id);

    const fakes = stats.fakes;
    const leave = stats.leaves;
    const bonus = stats.bonus;
    const valid = stats.total - (fakes + leave + bonus);
    const total = stats.fakes + valid + stats.leaves + bonus;

    if (!total)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle("Pas d'invitations")
                        .setDescription(`${pingUser(user)} n'a aucune invitation`)
                ],
                ephemeral: true
            })
            .catch(log4js.trace);

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Invitations')
                    .setDescription(
                        `${pingUser(user)} a un total de **${numerize(total)}** invitation${plurial(
                            total
                        )}\n\n✅ ${numerize(valid)} valide${plurial(valid)}\n✨ ${numerize(
                            bonus
                        )} bonus\n🔄️ ${numerize(fakes)} répétée${plurial(fakes)}\n❌ ${numerize(leave)} parti${plurial(
                            leave
                        )}`
                    )
            ]
        })
        .catch(log4js.trace);
});
