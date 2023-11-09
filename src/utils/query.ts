import { MysqlError, createConnection } from 'mysql';
import { config } from 'dotenv';
import { DefaultQueryResult, QueryResult } from '../typings/database';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { util } from './functions';
import { boolEmoji, codeBox } from './toolbox';
import logs from '../data/sqllogs.json';
import { sqlLog } from '../typings/functions';
import { writeFileSync } from 'fs';
import pools from '../cache/pools';
config();

export const database = createConnection(process.env);

database.connect((error) => {
    if (error) {
        throw error;
    }
});

export default function <T = DefaultQueryResult>(query: string, parameters?: any[]): Promise<QueryResult<T>> {
    const id = logs.length;
    logs.push({
        id: id,
        query: query,
        startDate: Date.now()
    } as sqlLog<T, false>);
    writeFileSync(`./dist/data/sqllogs.json`, JSON.stringify(logs));

    return new Promise((resolve, reject) => {
        const callback = (error: MysqlError, request: QueryResult<T>) => {
            const data = {
                ...(logs as sqlLog<false>[]).find((x) => x.id === id),
                endate: Date.now(),
                errorMessage: error ? error.message : null,
                isError: error ? true : false,
                response: request ?? null
            } as sqlLog<T>;
            logs[logs.indexOf(logs.find((x) => x.id === id))] = data;

            writeFileSync(`./dist/data/sqllogs.json`, JSON.stringify(logs));

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
        };
        if (!!parameters && parameters.length > 0) {
            pools.pool.pool.query(query, parameters, callback);
        } else {
            pools.pool.pool.query(query, callback);
        }
        pools.increaseIndex();
    });
}
