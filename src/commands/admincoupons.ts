import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
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
    subcmd
} from '../utils/toolbox';
import { WordGenerator } from '../managers/Generator';
import query from '../utils/query';
import { DatabaseTables, coupons, modActionType } from '../typings/database';
import couponsErrors from '../maps/couponsErrors';
import { util } from '../utils/functions';
import replies from '../data/replies';

export default new AmethystCommand({
    name: 'admincoupons',
    description: 'Gère les coupons sur le serveur',
    permissions: ['Administrator'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'créer',
            description: 'Crée un coupon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'valeur',
                    description: 'Valeur du coupon',
                    required: false,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1
                }
            ]
        },
        {
            name: 'liste',
            description: 'Affiche la liste des coupons',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'supprimer',
            description: 'Supprime un coupon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'coupon',
                    description: 'Coupon à supprimer',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!interaction.client.modulesManager.enabled(interaction.guild.id, 'economy'))
        return interaction
            .reply({
                embeds: [replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'economy' })],
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
                            .setTitle('Erreur de génération')
                            .setDescription(
                                `Je n'ai pas pu générer de code pour le coupon.\nVeuillez réessayez la commande.\n${hint(
                                    `Si l'erreur persiste, contactez le serveur de support`
                                )}`
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
            type: modActionType.CouponCreated,
            mod_id: interaction.user.id,
            member_id: '',
            reason: `Coupon d'une valeur de ${numerize(amount)}`
        });

        interaction
            .editReply({
                content: `Le coupon d'une valeur de ${numerize(amount)} ${util(
                    'coins'
                )} a été généré. Vous pouvez voir la liste des coupons avec la commande \`/admincoupons liste\`\n\nLe code du coupon est : ${codeBox(
                    valid[0]
                )}`
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
                            .setTitle('Pas de coupons')
                            .setDescription(`Il n'y a aucun coupons sur ce serveur`)
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { defaultColor: true })
                .setTitle('Liste des coupons')
                .setDescription(`Il y a ${numerize(list.length)} coupon${plurial(list.length)} sur le serveur`);
        };
        const map = (coupon: coupons, embed: EmbedBuilder) => {
            return embed.addFields({
                name: coupon.coupon,
                value: `Valeur de ${numerize(coupon.amount)} ${util('coins')}`,
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

        const res = await query<coupons>(
            `DELETE FROM ${DatabaseTables.Coupons} WHERE coupon="${coupon}" RETURNING amount, coupon`
        );
        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: '',
            type: modActionType.CouponDeleted,
            reason: `Coupon d'une valeur de ${numerize(res[0].amount)} ${util('coins')}`
        }).catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle('Coupon supprimé')
                        .setDescription(
                            `Un coupon d'une valeur de ${numerize(res[0].amount)} ${util('coins')} a été supprimé`
                        )
                        .setFields({
                            name: 'Code',
                            value: codeBox(res[0].coupon),
                            inline: false
                        })
                ]
            })
            .catch(() => {});
    }
});
