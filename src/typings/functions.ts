import perms from '../data/perms.json';

export type randomType = {
    max?: number;
    min?: number;
}
export type permType = keyof typeof perms;