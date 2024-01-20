import { GBan } from '../cache/managers';
import { ButtonHandler } from 'amethystjs';
import dev from '../preconditions/dev';
import { ButtonIds } from '../typings/buttons';
import { basicEmbed, displayDate, numerize, pagination, plurial } from '../utils/toolbox';
import { EmbedBuilder } from 'discord.js';
import { GBan as GBanType } from '../typings/database';

export default new ButtonHandler({
    preconditions: [dev],
    customId: ButtonIds.GBanList
}).setRun(async ({ button, user }) => {
    const list = GBan.cache;

    if (list.length === 0)
        return button
            .reply({
                content: `Aucun utilisateur GBanni`,
                ephemeral: true
            })
            .catch(() => {});

    const basic = () => {
        return basicEmbed(user, { draverColor: true })
            .setTitle('Liste des GBan')
            .setDescription(
                `${numerize(list.length)} personne${plurial(list, {
                    singular: ' est GBannie',
                    plurial: 's sont GBannies'
                })}`
            );
    };
    const map = (embed: EmbedBuilder, data: GBanType) => {
        return embed.addFields({
            name: data.user_id,
            value: `\`${data.user_id}\` ( <@${data.user_id}> )\nGBanni ${displayDate(parseInt(data.date))}\nRaison : ${
                data.reason
            }`,
            inline: false
        });
    };

    if (list.length <= 5) {
        const embed = basic();
        list.forEach((x) => {
            map(embed, x);
        });

        button
            .reply({
                embeds: [embed],
                ephemeral: true
            })
            .catch(() => {});
    } else {
        const embeds = [basic()];

        list.forEach((v, i) => {
            if (i % 5 === 0 && i > 0) embeds.push(basic());

            map(embeds[embeds.length - 1], v);
        });

        pagination({
            interaction: button,
            user: user,
            embeds,
            ephemeral: true
        });
    }
});
