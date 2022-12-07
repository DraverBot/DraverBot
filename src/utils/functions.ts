import perms from '../data/perms.json'
import { permType } from '../typings/functions'
import utils from '../data/utils.json';

export const getPerm = (key: permType) => {
    return perms[key]   
}
export const util = <T = any>(key: keyof typeof utils) => {
    return utils[key] as T;
}