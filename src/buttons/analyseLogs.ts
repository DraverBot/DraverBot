import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import Logs from '../data/sqllogs.json';
import { basicEmbed, codeBox, displayDate, evokerColor, numerize, plurial, resizeString } from '../utils/toolbox';
import { sqlLog } from '../typings/functions';

const logs = Logs as sqlLog[];

export default new ButtonHandler({
    customId: ButtonIds.AnalyzeSqlLogs,
    preconditions: [dev]
}).setRun(async ({ button, user }) => {
    if (logs.length === 0)
        return button
            .reply({
                ephemeral: true,
                content: 'Pas de logs'
            })
            .catch(() => {});

    const last = logs[logs.length - 1];
    const lastError = logs.filter((x) => x.isError).sort((a, b) => b.id - a.id)[0];
    button
        .reply({
            ephemeral: true,
            embeds: [
                basicEmbed(user, { draverColor: true })
                    .setTitle('Logs')
                    .setDescription(
                        `${numerize(logs.length)} log${plurial(logs.length)} (${numerize(
                            logs.filter((x) => x.isError).length
                        )} erreur(s))\nDernière requête: ${displayDate(logs[logs.length - 1].endate)}`
                    ),
                basicEmbed(user, {
                    draverColor: true
                })
                    .setTitle('Dernière requête')
                    .setDescription(
                        `Dernière requête ${displayDate(last.endate)}\nEn-tête: ${codeBox(
                            resizeString({ str: last.query, length: 200 }),
                            'sql'
                        )}\nErreur: ${last.isError ? last.errorMessage : 'N/A'}\nRéponse: ${
                            last.isError
                                ? 'N/A'
                                : codeBox(resizeString({ str: JSON.stringify(last.response), length: 500 }), 'sql')
                        }\nId: \`${last.id}\``
                    ),
                basicEmbed(user)
                    .setTitle('Dernière erreur')
                    .setDescription(
                        lastError
                            ? `ID: \`${lastError.id}\`\nEnvoyée ${displayDate(lastError.startDate)}\nEn-tête: ${codeBox(
                                  resizeString({ str: lastError.query, length: 300 }),
                                  'sql'
                              )}\nErreur: ${codeBox(lastError.errorMessage)}`
                            : "Pas d'erreur"
                    )
                    .setColor(lastError ? evokerColor(button.guild) : '#00ff00')
            ]
        })
        .catch(() => {});
});
