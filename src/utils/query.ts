import { createConnection } from 'mysql';
import { config } from 'dotenv';
config();

const database = createConnection(process.env);

database.connect((error) => {
    if (error) {
        throw error;
    }
});

export default function <T = any>(query: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        database.query(query, (error, request) => {
            if (error) return reject(error);
            resolve(request);
        });
    });
}
