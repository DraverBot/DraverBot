import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import replies from '../data/replies';
import moduleEnabled from '../preconditions/moduleEnabled';
import { util } from '../utils/functions';
import { basicEmbed, confirm, evokerColor, numerize, random } from '../utils/toolbox';

export default new DraverCommand({
    name: 'pay',
    module: 'economy',
    description: "Envoie de l'argent à quelqu'un sur le serveur",
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'utilisateur',
            description: "Utilisateur à qui vous voulez envoyer de l'argent",
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'montant',
            description: 'Montant de la transaction que vous voulez effectuer',
            required: true,
            type: ApplicationCommandOptionType.Integer,
            minValue: 1
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const user = options.getUser('utilisateur');
    const amount = options.getInteger('montant');

    if (user.id === interaction.user.id)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Auto-transaction')
                        .setDescription(`Vous ne pouvez pas vous envoyer de l'argent tout seul`)
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});
    if (user.bot)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Transaction à un robot')
                        .setDescription(
                            `Vous ne pouvez pas envoyer de l'argent à un robot${
                                random({ max: 100 }) === 14 ? ' (il ne saurait pas quoi en faire)' : ''
                            }`
                        )
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    if (
        interaction.client.coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        }).coins < amount
    )
        return interaction
            .reply({
                embeds: [replies.notEnoughCoins(interaction.member as GuildMember)]
            })
            .catch(() => {});

    const validated = await confirm({
        interaction,
        user: interaction.user,
        embed: basicEmbed(interaction.user)
            .setTitle('Transaction')
            .setDescription(
                `Vous êtes sur le point de donner **${numerize(amount)} ${util(
                    'coins'
                )}** à ${user}.\nVoulez-vous continuer ?`
            )
    });

    if (validated === 'cancel' || !validated?.value)
        return interaction.editReply({
            embeds: [replies.cancel()],
            components: []
        });

    interaction.client.coinsManager.addCoins({
        guild_id: interaction.guild.id,
        user_id: user.id,
        coins: amount
    });
    interaction.client.coinsManager.removeCoins({
        guild_id: interaction.guild.id,
        user_id: user.id,
        coins: amount
    });
    interaction
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Transaction effectuée')
                    .setDescription(`Vous avez donné **${numerize(amount)} ${util('coins')}** à ${user}`)
            ],
            components: []
        })
        .catch(() => {});
});
