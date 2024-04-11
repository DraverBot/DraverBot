import { modulesManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import {
    addModLog,
    basicEmbed,
    codeBox,
    evokerColor,
    hint,
    numerize,
    pagination,
    plurial,
    random,
    sqliseString,
    subcmd
} from '../../utils/toolbox';
import { WordGenerator } from '../../managers/Generator';
import query from '../../utils/query';
import { DatabaseTables, coupons } from '../../typings/database';
import couponsErrors from '../../maps/couponsErrors';
import { util } from '../../utils/functions';
import replies from '../../data/replies';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.coupons'),
    module: 'administration',
    permissions: ['Administrator'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.admins.coupons.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coupons.options.create.options.value'),
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.coupons.options.list'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.coupons.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.coupons.options.delete.options.coupon'),
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!modulesManager.enabled(interaction.guild.id, 'economy'))
        return interaction
            .reply({
                embeds: [
                    replies.moduleDisabled(interaction.user, {
                        guild: interaction.guild,
                        module: 'economy',
                        lang: interaction
                    })
                ],
                ephemeral: true
            })
            .catch(() => {});

    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const amount = options.getInteger('valeur') ?? 1000;

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const tries = [];
        const userTries = couponsErrors.get(interaction.user.id) ?? 0;
        couponsErrors.set(interaction.user.id, userTries + 1);

        for (let i = 0; i < (userTries > 3 ? 25 : 15); i++) {
            const code = new WordGenerator({
                length: random({ max: 22, min: 16 }),
                capitals: true,
                letters: true,
                numbers: true,
                special: true,
                includeSpaces: false,
                charsToRemove: '`"'
            }).generate();

            tries.push(code.replace(/"/g, ''));
        }

        const res = await query<{ coupon: string }>(
            `SELECT coupon FROM ${DatabaseTables.Coupons} WHERE coupon IN ( ${tries.map((x) => `"${x}"`).join(', ')} )`
        );
        const valid = tries.filter((x) => !res.find((y) => y.coupon === x));
        if (valid.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle(
                                translator.translate('commands.admins.coupons.replies.generateError.title', interaction)
                            )
                            .setDescription(
                                translator.translate(
                                    'commands.admins.coupons.replies.generateError.description',
                                    interaction
                                )
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await query(
            `INSERT INTO ${DatabaseTables.Coupons} ( guild_id, coupon, amount ) VALUES ( '${interaction.guild.id}', "${valid[0]}", '${amount}' )`
        );
        await addModLog({
            guild: interaction.guild,
            type: 'CouponCreated',
            mod_id: interaction.user.id,
            member_id: '',
            reason: `Coupon d'une valeur de ${numerize(amount)}`
        });

        interaction
            .editReply({
                content: translator.translate('commands.admins.coupons.replies.created', interaction, {
                    amount,
                    code: valid[0]
                })
            })
            .catch(() => {});
    }
    if (cmd === 'liste') {
        await interaction.deferReply({ ephemeral: true });
        const list = await query<coupons>(
            `SELECT * FROM ${DatabaseTables.Coupons} WHERE guild_id='${interaction.guild.id}'`
        );

        if (list.length === 0)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setColor(evokerColor(interaction.guild))
                            .setTitle(translator.translate('commands.admins.coupons.replies.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.coupons.replies.description', interaction)
                            )
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle(translator.translate('commands.admins.coupons.replies.list.title', interaction))
                .setDescription(
                    translator.translate('commands.admins.coupons.replies.list.description', interaction, {
                        count: list.length
                    })
                );
        };
        const map = (coupon: coupons, embed: EmbedBuilder) => {
            return embed.addFields({
                name: coupon.coupon,
                value: translator.translate('commands.admins.coupons.replies.list.mapper', interaction, {
                    amount: coupon.amount
                }),
                inline: false
            });
        };

        if (list.length <= 5) {
            const embed = basic();
            for (const coupon of list) {
                map(coupon, embed);
            }

            interaction
                .editReply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds: EmbedBuilder[] = [basic()];

            list.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                map(v, embeds[embeds.length - 1]);
            });

            pagination({
                interaction,
                user: interaction.user,
                embeds
            });
        }
    }
    if (cmd === 'supprimer') {
        const coupon = options.getString('coupon');
        await interaction.deferReply().catch(() => {});

        const res = await query<coupons>(`SELECT * FROM coupons WHERE coupon="${sqliseString(coupon)}"`);
        await query(`DELETE FROM ${DatabaseTables.Coupons} WHERE coupon="${sqliseString(coupon)}"`);

        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: '',
            type: 'CouponDeleted',
            reason: `Coupon d'une valeur de ${numerize(res[0].amount)} ${util('coins')}`
        }).catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.coupons.replies.deleted.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.coupons.replies.deleted.description', interaction, {
                                amount: res[0].amount
                            })
                        )
                        .setFields({
                            name: translator.translate('commands.admins.coupons.replies.deleted.codeName', interaction),
                            value: codeBox(res[0].coupon),
                            inline: false
                        })
                ]
            })
            .catch(() => {});
    }
});
