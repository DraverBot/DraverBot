import { embedsInputData } from 'discordjs-giveaways';
import { basicEmbed, displayDate, numerize, plurial } from '../utils/toolbox';
import { EmbedBuilder } from 'discord.js';

export const giveawayEmbeds: embedsInputData = {
    giveaway: (data) => {
        return new EmbedBuilder()
            .setTitle("🎉 Giveaway 🎉")
            .setDescription(`<@${data.hoster_id}> offre un giveaway !\nIl y a ${numerize(data.participants.length)} participant${plurial(data.participants.length, {})}\n\nAppuyez sur le bouton pour tenter de gagner : __${data.reward}__\nLe giveaway prendra fin ${displayDate(data.time + Date.now())}`)
    }
}