import { ButtonInteraction, CommandInteraction, EmbedBuilder, Guild, GuildMember, Role, User } from 'discord.js';
import perms from '../data/perms.json';
import { QueryResult, modActionType } from './database';

export type randomType = {
    max?: number;
    min?: number;
};
export type permType<Type extends keyof typeof perms> = keyof (typeof perms)[Type];
export type addModLog = {
    guild: Guild;
    reason: string;
    member_id: string;
    mod_id: string;
    type: keyof typeof modActionType;
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
    ephemeral?: boolean;
};
export type paginatorOptions = {
    interaction: CommandInteraction | ButtonInteraction;
    user: User;
    embeds: EmbedBuilder[];
    time?: number;
    ephemeral?: boolean;
};
export type updateLogOptions = {
    guild: Guild;
    case_id: string;
    reason?: string;
    proofURL?: string;
};
export type confirmReturn = { value: boolean; interaction: ButtonInteraction } | 'cancel';
export type sendLogOpts = {
    guild: Guild;
    action: keyof typeof modActionType;
    proof?: string;
    mod_id: string;
    member_id: string;
    reason: string;
};
export type checkRoleOptions = {
    respond?: boolean;
    role: Role;
    member?: GuildMember;
    interaction?: CommandInteraction;
    ephemeral?: boolean;
};
export type sqlLog<T = unknown, Completed extends boolean = true> = {
    query: string;
    id: number;
    startDate: number;
} & (Completed extends true
    ? { isError: boolean; errorMessage: string | null; endate: number; response: QueryResult<T> | null }
    : Record<string, never>);
export type ElementType<T extends any[]> = T extends Array<infer U> ? U : never;
