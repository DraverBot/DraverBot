import { coinsManager } from '../cache/managers';
import { DraverCommand } from '../structures/DraverCommand';
import { preconditions, waitForInteraction } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import {
    ComponentType,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { basicEmbed, evokerColor, numerize, plurial, row, sqliseString, waitForReplies } from '../utils/toolbox';
import replies from '../data/replies';
import query from '../utils/query';
import { DatabaseTables, coupons } from '../typings/database';
import { util } from '../utils/functions';
import { yesNoRow } from '../data/buttons';

export default new DraverCommand({
    name: 'coupon',
    module: 'economy',
    description: 'Réclame un coupon',
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction }) => {
    const modal = new ModalBuilder({
        title: 'Réclamation de coupon',
        customId: 'couponClaimModal',
        components: [
            row<TextInputBuilder>(
                new TextInputBuilder()
                    .setCustomId('coupon.code')
                    .setLabel('Code du coupon')
                    .setPlaceholder('code du coupon')
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

    if (!res) return res.reply({ embeds: [replies.cancel()] }).catch(() => {});

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
                        .setTitle('Coupon inexistant')
                        .setDescription(`Ce coupon n'existe pas`)
                        .setColor(evokerColor(interaction.guild))
                ]
            })
            .catch(() => {});
    await res
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { questionMark: true })
                    .setTitle(`Réclamation`)
                    .setDescription(
                        `Voulez-vous réclamer ce coupon d'une valeur de **${numerize(coupon[0].amount)} ${util(
                            'coins'
                        )}** ?`
                    )
            ],
            components: [yesNoRow()]
        })
        .catch(() => {});

    const input = await waitForInteraction({
        componentType: ComponentType.Button,
        user: interaction.user,
        message: msg,
        replies: waitForReplies(interaction.client)
    });

    if (!input || input.customId === 'no')
        return res
            .editReply({
                embeds: [replies.cancel()],
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
                .setTitle(`${util('coins')} ajouté${plurial(coupon[0].amount)}`)
                .setDescription(
                    `**${numerize(coupon[0].amount)} ${util('coins')}** ${
                        coupon[0].amount === 1 ? 'a été ajouté' : 'ont été ajoutés'
                    } à votre compte`
                )
        ],
        components: []
    }).catch(() => {});
    query(`DELETE FROM ${DatabaseTables.Coupons} WHERE coupon="${coupon[0].coupon}"`).catch(() => {});
});
