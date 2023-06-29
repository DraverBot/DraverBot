import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import masterminds from '../maps/masterminds';
import { basicEmbed, confirm } from '../utils/toolbox';

export default new ButtonHandler({
    customId: ButtonIds.ResignToCurrentMastermind
}).setRun(async ({ button, message, user }) => {
    if (!masterminds.has(user.id))
        return message.delete().catch(() => {
            button
                .reply({
                    embeds: [
                        basicEmbed(user, { evoker: button.guild })
                            .setTitle('Pas de partie')
                            .setDescription(`Vous n'avez aucune partie en cours`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        });

    const confirmation = await confirm({
        interaction: button,
        user,
        ephemeral: true,
        embed: basicEmbed(user)
            .setTitle('Abandon')
            .setTitle('Êtes-vous sûr de vouloir abandonner votre partie en cours ?')
    }).catch(log4js.trace);

    if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
        return button.deleteReply().catch(() => {
            if (confirmation && confirmation !== 'cancel') confirmation.interaction.deferUpdate().catch(log4js.trace);
        });

    if (masterminds.has(user.id)) {
        masterminds.get(user.id).resign();
        masterminds.delete(user.id);
    }
    message.delete().catch(() => {});
    button
        .editReply({
            embeds: [
                basicEmbed(user, { draverColor: true })
                    .setTitle('Abandonnée')
                    .setDescription(`Votre partie en cours a été abandonnée`)
            ],
            components: []
        })
        .catch(log4js.trace);
});
