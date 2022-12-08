import { Guild } from 'discord.js';
import perms from '../data/perms.json';
import { modActionType } from './database';

export type randomType = {
    max?: number;
    min?: number;
};
export type permType = keyof typeof perms;
export type addModLog = {
    guild: Guild;
    reason: string;
    member_id: string;
    mod_id: string;
    type: modActionType;
    /**
     * Image URL
     *
     * Can be null
     */
    proof?: string;
};
