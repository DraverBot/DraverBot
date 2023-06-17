import { log4js } from 'amethystjs';
import { DatabaseTables, plugboard } from '../typings/database';
import query from '../utils/query';
import { removeKey, sqliseString } from '../utils/toolbox';
import { Plugboard } from 'enigma-machine';
import { ConnectionMap } from 'enigma-machine/build/typings/types';

export class PlugboardsManager {
    private cache: plugboard<false>[] = [];

    constructor() {
        this.init();
    }

    public getPlugboard(id: number) {
        const plugs = this.cache.find((x) => x.id === id);
        if (!plugs) return undefined;

        return {
            ...plugs,
            board: new Plugboard(JSON.parse(JSON.stringify(plugs.plugboard)))
        };
    }
    public getUserPlugs(userId: string) {
        return this.cache.filter((x) => x.user_id === userId);
    }
    public async addPlugboard({
        userId,
        name,
        connections
    }: {
        userId: string;
        name: string;
        connections: ConnectionMap;
    }) {
        if (this.getUserPlugs(userId).find((x) => x.name === name)) return 'name already taken';
        const insertion = await query(
            `INSERT INTO ${
                DatabaseTables.Plugboards
            } ( user_id, plugboard, name ) VALUES ( "${userId}", "${sqliseString(
                JSON.stringify(connections)
            )}", "${sqliseString(name)}" )`
        );

        this.cache.push({
            name,
            user_id: userId,
            plugboard: connections,
            id: insertion.insertId
        });

        return true;
    }
    public deletePlugboard(id: number) {
        this.cache = this.cache.filter((x) => x.id !== id);
        query(`DELETE FROM ${DatabaseTables.Plugboards} WHERE id='${id}'`);
    }

    private async fillCache() {
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Plugboards} ( user_id VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, plugboard LONGTEXT, id INTEGER(255) NOT NULL PRIMARY KEY AUTO_INCREMENT )`
        );
        const datas = await query<plugboard<true>>(`SELECT * FROM ${DatabaseTables.Plugboards}`);
        if (!datas) return log4js.trace('No data in plugboards manager');

        this.cache = datas.map((x) => ({ plugboard: JSON.parse(x.plugboard), ...removeKey(x, 'plugboard') }));
    }
    private init() {
        this.fillCache();
    }
}
