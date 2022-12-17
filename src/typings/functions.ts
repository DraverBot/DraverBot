import { ButtonInteraction, CommandInteraction, EmbedBuilder, Guild, GuildMember, User } from 'discord.js';
import perms from '../data/perms.json';
import { modActionType } from './database';
import commandModules from '../data/commandsModules.json';

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
};
export type paginatorOptions = {
    interaction: CommandInteraction;
    user: User;
    embeds: EmbedBuilder[];
    time?: number;
};
export type updateLogOptions = {
    guild: Guild;
    case_id: string;
    reason?: string;
    proofURL?: string;
};
export type commandName = keyof typeof commandModules;
export type confirmReturn = { value: boolean; interaction: ButtonInteraction } | 'cancel';
export type sendLogOpts = {
    guild: Guild;
    action: modActionType;
    proof?: string;
    mod_id: string;
    member_id: string;
    reason: string;
}
