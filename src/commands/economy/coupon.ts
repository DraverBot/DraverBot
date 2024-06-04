import { coinsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import {
    ComponentType,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { basicEmbed, evokerColor, numerize, plurial, row, sqliseString, waitForReplies } from '../../utils/toolbox';
import replies from '../../data/replies';
import query from '../../utils/query';
import { DatabaseTables, coupons } from '../../typings/database';
import { util } from '../../utils/functions';
import { yesNoRow } from '../../data/buttons';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.economy.coupon'),
    module: 'economy',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    const modal = new ModalBuilder({
        title: translator.translate('commands.economy.coupon.modal.title', interaction),
        customId: 'couponClaimModal',
        components: [
            row<TextInputBuilder>(
                new TextInputBuilder()
                    .setCustomId('coupon.code')
                    .setLabel(translator.translate('commands.economy.coupon.modal.fields.label', interaction))
                    .setPlaceholder(translator.translate('commands.economy.coupon.modal.fields.placeholder', interaction))
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short)
            )
        ]
    });

    interaction.showModal(modal).catch(() => {});
    const res = (await interaction
        .awaitModalSubmit({
            time: 180000
        })
        .catch(() => {})) as ModalSubmitInteraction;

    if (!res) return res.reply({ embeds: [replies.cancel(interaction)] }).catch(() => {});

    const msg = (await res
        .deferReply({
            fetchReply: true
        })
        .catch(() => {})) as Message<true>;

    const coupon = await query<coupons>(
        `SELECT * FROM ${DatabaseTables.Coupons} WHERE coupon="${sqliseString(
            res.fields.getTextInputValue('coupon.code')
        )}" AND guild_id='${interaction.guild.id}'`
    );

    if (!coupon || coupon.length === 0)
        return res
            .editReply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle(translator.translate('commands.economy.coupon.replies.unexisting.title', interaction))
                        .setDescription(translator.translate('commands.economy.coupon.replies.unexisting.description', interaction))
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});
    await res
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { questionMark: true })
                    .setTitle(translator.translate('commands.economy.coupon.replies.claiming.title', interaction))
                    .setDescription(
                        translator.translate('commands.economy.coupon.replies.claiming.description', interaction, {
                            amount: coupon[0].amount
                        })
                    )
            ],
            components: [yesNoRow(interaction)]
        })
        .catch(() => {});

    const input = await waitForInteraction({
        componentType: ComponentType.Button,
        user: interaction.user,
        message: msg,
        replies: waitForReplies(interaction.client, interaction)
    });

    if (!input || input.customId === 'no')
        return res
            .editReply({
                embeds: [replies.cancel(interaction)],
                components: []
            })
            .catch(() => {});

    coinsManager.addCoins({
        guild_id: interaction.guild.id,
        user_id: interaction.user.id,
        coins: coupon[0].amount
    });

    res.editReply({
        embeds: [
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.economy.coupon.replies.claimed.title', interaction))
                .setDescription(
                    translator.translate('commands.economy.coupon.replies.claimed.description', interaction, {
                        amount: coupon[0].amount
                    })
                )
        ],
        components: []
    }).catch(() => {});
    query(`DELETE FROM ${DatabaseTables.Coupons} WHERE coupon="${coupon[0].coupon}"`).catch(() => {});
});
