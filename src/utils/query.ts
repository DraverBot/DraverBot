import { createConnection } from 'mysql';
import { config } from 'dotenv';
import { DefaultQueryResult, QueryResult } from '../typings/database';
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
            if (error) return reject(error);
            resolve(request);
        });
    });
}
