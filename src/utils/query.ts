import { createConnection } from 'mysql';
import { config } from 'dotenv';
import { DefaultQueryResult, QueryResult } from '../typings/database';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { util } from './functions';
import { boolEmoji, codeBox } from './toolbox';
config();

export const database = createConnection(process.env);

database.connect((error) => {
    if (error) {
        throw error;
    }
});

export default function <T = DefaultQueryResult>(query: string): Promise<QueryResult<T>> {
    return new Promise((resolve, reject) => {
        database.query(query, (error, request) => {
            if (error) {
                reject(error);
                const webhook = new WebhookClient({
                    url: util('errorWebhook')
                });

                if (webhook) {
                    webhook
                        .send({
                            embeds: [
                                new EmbedBuilder({
                                    title: 'Erreur SQL',
                                    description: `Requête: ${codeBox(query, 'sql')}\nErreur: ${error.message}${
                                        error.cause ? `\nCause: ${error.cause}` : ''
                                    }\nFatale: ${boolEmoji(error.fatal)}${
                                        error.sqlMessage ? `\nMessage SQL: ${codeBox(error.sqlMessage, 'sql')}` : ''
                                    }`,
                                    timestamp: new Date(Date.now())
                                })
                            ]
                        })
                        .catch(() => {});
                }
            }
            resolve(request);
        });
    });
}
