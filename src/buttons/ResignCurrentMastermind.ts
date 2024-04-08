import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import masterminds from '../maps/masterminds';
import { basicEmbed, confirm } from '../utils/toolbox';
import { translator } from '../translate/translate';

export default new ButtonHandler({
    customId: ButtonIds.ResignToCurrentMastermind
}).setRun(async ({ button, message, user }) => {
    if (!masterminds.has(user.id))
        return message.delete().catch(() => {
            button
                .reply({
                    embeds: [
                        basicEmbed(user, { evoker: button.guild })
                            .setTitle(translator.translate('fun.games.mastermind.notRunning.title', button))
                            .setDescription(translator.translate('fun.games.mastermind.notRunning.description', button))
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
            .setTitle(translator.translate('fun.games.mastermind.confirmation.title', button))
            .setTitle(translator.translate('fun.games.mastermind.confirmation.description', button))
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
                    .setTitle(translator.translate('fun.games.mastermind.resigned.title', button))
                    .setDescription(translator.translate('fun.games.mastermind.resigned.description', button))
            ],
            components: []
        })
        .catch(log4js.trace);
});
