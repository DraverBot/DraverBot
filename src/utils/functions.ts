import perms from '../data/perms.json'

export const getPerm = (key: keyof typeof perms) => {
    return perms[key]   
}