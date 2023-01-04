import { ChannelType, ColorResolvable } from 'discord.js';
import commandModules from '../data/commandsModules.json';
import emojis from '../data/emojis.json';
import { modulesData } from '../data/modulesData';
import perms from '../data/perms.json';
import utils from '../data/utils.json';
import { DatabaseTables, defaultJokesTypes, jokes, modActionType, moduleType } from '../typings/database';
import { commandName, permType } from '../typings/functions';
import query from './query';
import { boolDb, capitalize } from './toolbox';
import { channelTypeNames } from '../data/channelTypeNames';

export const getPerm = (key: permType) => {
    return perms[key];
};
export const util = <T>(key: keyof typeof utils) => {
    return utils[key] as T;
};
export const Module = (key: commandName) => {
    return commandModules[key] as moduleType;
};
export const checkDatabase = (): Promise<void> => {
    return new Promise(async (resolve) => {
        await query(
            `CREATE TABLE IF NOT EXISTS coins ( guild_id VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, coins BIGINT NOT NULL DEFAULT '100', bank BIGINT NOT NULL DEFAULT '0' )`
        );
        await query(
            `CREATE TABLE IF NOT EXISTS modules ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, ${Object.keys(modulesData)
                .map((n: moduleType) => `${n} TINYINT(1) NOT NULL DEFAULT "${boolDb(modulesData[n].default)}"`)
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
        await query(
            `CREATE TABLE IF NOT EXISTS giveaways ( guild_id TEXT(255) NOT NULL, channel_id TEXT(255) NOT NULL, message_id TEXT(255) NOT NULL, hoster_id TEXT(255) NOT NULL, reward TEXT(255) NOT NULL, winnerCount INTEGER(255) NOT NULL DEFAULT "1", endsAt VARCHAR(1024) NOT NULL, participants LONGTEXT, required_roles LONGTEXT, denied_roles LONGTEXT, bonus_roles LONGTEXT, winners LONGTEXT, ended TINYINT(1) NOT NULL DEFAULT "${boolDb(
                false
            )}" );`
        );
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Coupons} ( guild_id VARCHAR(255) NOT NULL, coupon VARCHAR(255) NOT NULL PRIMARY KEY, amount BIGINT NOT NULL DEFAULT '100' )`
        );
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Notes} ( guild_id VARCHAR(255) NOT NULL, member_id VARCHAR(255) NOT NULL, note VARCHAR(255) NOT NULL )`
        );
        await query(
            `CREATE TABLE IF NOT EXISTS ${DatabaseTables.JoinRoles} ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, roles LONGTEXT )`
        );
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
export const getModEmbedColor = (action: keyof typeof modActionType): ColorResolvable => {
    let color = util<ColorResolvable>('accentColor');
    switch (action) {
        case 'Ban':
        case 'Unban':
        case 'Warn':
        case 'Unmute':
        case 'Unwarn':
        case 'Kick':
        case 'Mute':
        case 'Rename':
        case 'JoinRoleRemoved':
        case 'NoteAdded':
            color = '#ff0000';
            break;
        case 'CoinsAdd':
        case 'CoinsRemove':
        case 'CoinsReset':
        case 'NoteModified':
            color = 'Yellow';
            break;
        case 'JoinRoleSet':
        case 'NoteRemoved':
            color = '#00ff00';
            break;
    }
    return color;
};
export const emoji = (key: keyof typeof emojis) => {
    return emojis[key];
};
export const channelTypeName = (type: keyof typeof ChannelType): string => {
    return channelTypeNames[type];
};
