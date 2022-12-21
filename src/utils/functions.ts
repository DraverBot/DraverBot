import perms from '../data/perms.json';
import { commandName, permType } from '../typings/functions';
import utils from '../data/utils.json';
import commandModules from '../data/commandsModules.json';
import query from './query';
import { modulesData } from '../data/modulesData';
import { DatabaseTables, defaultJokesTypes, jokes, modActionType, moduleType } from '../typings/database';
import { boolDb, capitalize } from './toolbox';
import { ColorResolvable } from 'discord.js';

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

        await query(
            `CREATE TABLE IF NOT EXISTS jokes ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, global TINYINT(1) NOT NULL DEFAULT '${boolDb(
                true
            )}', dev TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}', dark TINYINT(1) NOT NULL DEFAULT '${boolDb(
                false
            )}', \`limit\` TINYINT(1) NOT NULL DEFAULT '${boolDb(false)}', beauf TINYINT(1) NOT NULL DEFAULT '${boolDb(
                true
            )}', blondes TINYINT(1) NOT NULL DEFAULT '${boolDb(true)}')`
        );
        await query(`CREATE TABLE IF NOT EXISTS giveaways ( guild_id TEXT(255) NOT NULL, channel_id TEXT(255) NOT NULL, message_id TEXT(255) NOT NULL, hoster_id TEXT(255) NOT NULL, reward TEXT(255) NOT NULL, winnerCount INTEGER(255) NOT NULL DEFAULT "1", endsAt VARCHAR(1024) NOT NULL, participants LONGTEXT NOT NULL DEFAULT '[]', required_roles LONGTEXT NOT NULL DEFAULT '[]', denied_roles LONGTEXT NOT NULL DEFAULT '[]', bonus_roles LONGTEXT NOT NULL DEFAULT '[]', winners LONGTEXT NOT NULL DEFAULT '[]', ended TINYINT(1) NOT NULL DEFAULT "0" );`);
        await query(`CREATE TABLE IF NOT EXISTS ${DatabaseTables.Coupons} ( guild_id VARCHAR(255) NOT NULL, coupon VARCHAR(255) NOT NULL PRIMARY KEY, amount INTEGER(255) NOT NULL DEFAULT '100' )`);
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
        datas[k] = boolDb(defaultJokesTypes[k]);
    });
    return datas as jokes;
};
export const getModEmbedColor = (action: modActionType): ColorResolvable => {
    let color = util('accentColor');
    switch (action) {
        case modActionType.Ban:
        case modActionType.Unban:
        case modActionType.Warn:
        case modActionType.Unmute:
        case modActionType.Unwarn:
        case modActionType.Kick:
        case modActionType.Mute:
            color = '#ff0000';
            break;
        case modActionType.CoinsAdd:
        case modActionType.CoinsRemove:
        case modActionType.CoinsReset:
            color = 'Yellow';
            break;
    }
    return color;
};
