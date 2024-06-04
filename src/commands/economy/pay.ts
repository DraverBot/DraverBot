import { coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import replies from '../../data/replies';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { util } from '../../utils/functions';
import { basicEmbed, confirm, evokerColor, numerize, pingUser, random } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.economy.pay'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.economy.pay.options.user'),
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            ...translator.commandData('commands.economy.pay.options.amount'),
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
                        .setTitle(translator.translate('commands.economy.pay.replies.auto.title', interaction))
                        .setDescription(translator.translate('commands.economy.pay.replies.auto.description', interaction))
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});
    if (user.bot)
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(translator.translate('commands.economy.pay.replies.robot.title', interaction))
                        .setDescription(
                            translator.translate('commands.economy.pay.replies.robot.description', interaction)
                        )
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});

    if (
        coinsManager.getData({
            guild_id: interaction.guild.id,
            user_id: interaction.user.id
        }).coins < amount
    )
        return interaction
            .reply({
                embeds: [replies.notEnoughCoins(interaction.member as GuildMember, interaction.user, interaction)]
            })
            .catch(() => {});

    const validated = await confirm({
        interaction,
        user: interaction.user,
        embed: basicEmbed(interaction.user)
            .setTitle(translator.translate('commands.economy.pay.replies.confirm.title', interaction))
            .setDescription(
                translator.translate('commands.economy.pay.replies.confirm.description', interaction, {
                    amount,
                    user: pingUser(user)
                })
            )
    });

    if (validated === 'cancel' || !validated?.value)
        return interaction.editReply({
            embeds: [replies.cancel(interaction)],
            components: []
        });

    coinsManager.addCoins({
        guild_id: interaction.guild.id,
        user_id: user.id,
        coins: amount
    });
    coinsManager.removeCoins({
        guild_id: interaction.guild.id,
        user_id: user.id,
        coins: amount
    });
    interaction
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(translator.translate('commands.economy.pay.replies.done.title', interaction))
                    .setDescription(translator.translate('commands.economy.pay.replies.done.description', interaction, { amount, user: pingUser(user) }))
            ],
            components: []
        })
        .catch(() => {});
});
