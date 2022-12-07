import perms from '../data/perms.json'
import { permType } from '../typings/functions'

export const getPerm = (key: permType) => {
    return perms[key]   
}