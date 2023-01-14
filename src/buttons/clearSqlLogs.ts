import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { writeFileSync } from 'fs';
import { basicEmbed, confirm, numerize, plurial, sendError } from '../utils/toolbox';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';
import logs from '../data/sqllogs.json';

export default new ButtonHandler({
    customId: ButtonIds.ClearSqlLogs,
    preconditions: [dev]
}).setRun(async ({ user, button }) => {
    const confirmation = (await confirm({
        interaction: button,
        embed: basicEmbed(user)
            .setTitle('Suppression')
            .setDescription(`Êtes-vous sûr de vouloir effacer les logs SQL ?`),
        ephemeral: true,
        user
    }).catch(sendError)) as confirmReturn;

    if (confirmation === 'cancel' || !confirmation?.value)
        return button
            .editReply({
                embeds: [replies.cancel()],
                components: []
            })
            .catch(sendError);

    const length = logs.length;
    logs.splice(0, length);
    writeFileSync(`./dist/data/sqllogs.json`, JSON.stringify([]));
    button
        .editReply({
            embeds: [
                basicEmbed(user, { draverColor: true })
                    .setTitle('Logs effacés')
                    .setDescription(
                        `${numerize(length)} log${plurial(length, {
                            singular: ' a',
                            plurial: 's ont'
                        })} été effacé${plurial(length)}`
                    )
            ],
            components: []
        })
        .catch(sendError);
});
