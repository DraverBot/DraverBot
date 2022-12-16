import perms from '../data/perms.json';
import { commandName, permType } from '../typings/functions';
import utils from '../data/utils.json';
import commandModules from '../data/commandsModules.json';
import query from './query';
import { modulesData } from '../data/modulesData';
import { defaultJokesTypes, jokes, moduleType } from '../typings/database';
import { boolDb, capitalize, dbBool } from './toolbox';

export const getPerm = (key: permType) => {
    return perms[key];
};
export const util = <T = any>(key: keyof typeof utils) => {
    return utils[key] as T;
};
export const Module = (key: commandName) => {
    return commandModules[key] as moduleType;
};
export const checkDatabase = (): Promise<void> => {
    return new Promise(async (resolve) => {
        await query(
            `CREATE TABLE IF NOT EXISTS modules ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, ${Object.keys(modulesData)
                .map((n: moduleType) => `${n} TINYINT(1) NOT NULL DEFAULT "${modulesData[n].default ? '0' : '1'}"`)
                .join(', ')} )`
        );
        await query(
            `CREATE TABLE IF NOT EXISTS modlogs ( guild_id VARCHAR(255) NOT NULL, mod_id VARCHAR(255) NOT NULL, member_id VARCHAR(255) NOT NULL DEFAULT "", date VARCHAR(255) NOT NULL, type VARCHAR(255) NOT NULL, reason VARCHAR(1024) NOT NULL DEFAULT "Pas de raison", proof VARCHAR(255) NOT NULL DEFAULT "", autoMod TINYINT(1) NOT NULL DEFAULT "${boolDb(
                false
            )}", deleted TINYINT(1) NOT NULL DEFAULT "${boolDb(false)}", edited TINYINT(1) NOT NULL DEFAULT "${boolDb(
                false
            )}", lastEditedTimestamp VARCHAR(255) NOT NULL DEFAULT "", case_id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY )`
        );

        await query(`CREATE TABLE IF NOT EXISTS jokes ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, global TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}', dev TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}', dark TINYINT(1) NOT NULL DEFAULT '${boolDb(false)}', \`limit\` TINYINT(1) NOT NULL DEFAULT '${boolDb(false)}', beauf TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}', blondes TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}')`)
        resolve();
    });
};
export const moduleName = (module: moduleType, capitalise?: boolean) => {
    const name = modulesData[module].name;
    if (capitalise === true) return capitalize(name);
    return name;
};
export const getDefaultJokeConfigs = (guild_id: string): jokes => {
    const datas = { guild_id };
    Object.keys(defaultJokesTypes).forEach((k) => {
        datas[k] = boolDb(defaultJokesTypes[k])
    });
    return datas as jokes;
}
