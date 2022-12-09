import { CommandInteraction, Guild, GuildMember } from 'discord.js';
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
export type checkPermsOptions = {
    member: GuildMember;
    mod: GuildMember;
    /**
     * Returns false if member is bot
     */
    checkBot?: boolean;
    /**
     * Returns false if member is owner
     */
    checkOwner?: boolean;
    /**
     * Returns false if member has superior role than mod
     */
    checkModPosition?: boolean;
    /**
     * Returns false if members has superior role than client
     */
    checkClientPosition?: boolean;
    interaction?: CommandInteraction;
    /**
     * Send an error message if a check fails
     * 
     * You need to specify `interaction`
     */
    sendErrorMessage?: boolean;
    /**
     * Returns true if mod is owner
     * @warning This test is the first
     */
    ownerByPass?: boolean;
    /**
     * Returns true if the mod is the member
     */
    checkSelf?: boolean;
}
