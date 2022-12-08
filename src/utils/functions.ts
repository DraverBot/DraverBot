import perms from '../data/perms.json'
import { permType } from '../typings/functions'
import utils from '../data/utils.json';
import commandModules from '../data/commandsModules.json';
import query from './query';
import { modulesData } from '../data/modulesData';
import { moduleType } from '../typings/database';
import { capitalize } from './toolbox';

export const getPerm = (key: permType) => {
    return perms[key]   
}
export const util = <T = any>(key: keyof typeof utils) => {
    return utils[key] as T;
}
export const Module = (key: keyof typeof commandModules) => {
    return commandModules[key] as moduleType;
}
export const checkDatabase = (): Promise<void> => {
    return new Promise(async(resolve) => {
        await query(`CREATE TABLE IF NOT EXISTS modules ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, ${Object.keys(modulesData).map((n: moduleType) => `${n} TINYINT(1) NOT NULL DEFAULT "${modulesData[n].default ? '0' : '1'}"`).join(', ')} )`)

        resolve()
    })
}
export const moduleName = (module: moduleType, capitalise?: boolean) => {
    const name = modulesData[module].name;
    if (capitalise === true) return capitalize(name);
    return name;
}