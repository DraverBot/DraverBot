import { If } from 'discord.js';
import { configKeys } from '../data/configData';
import { ConnectionMap } from 'enigma-machine/build/typings/types';

export type DefaultQueryResult = {
    fieldCount: number;
    affectedRows: number;
    insertId: number;
    serverStatus: number;
    warningCount: number;
    message: string;
    protocol41: boolean;
    changedRows: number;
};
export type QueryResult<T> = T extends DefaultQueryResult ? DefaultQueryResult : T[];

export enum modActionType {
    Mute = 'Réduction au silence',
    Unmute = 'Retrait de réduction au silence',
    Ban = 'Bannissement',
    Unban = 'Débannissement',
    Kick = 'Expulsion',
    Warn = 'Avertissement',
    Unwarn = "Retrait d'avertissement",
    EditLog = 'Modification de log',
    CoinsReset = 'Réinitialisation économique',
    CoinsAdd = 'Ajout économique',
    CoinsRemove = 'Retrait économique',
    LogDeletion = 'Suppression de log',
    LevelReset = 'Réinitialisation de niveaux',
    CouponCreated = 'Coupon crée',
    CouponClaimed = 'Coupon utilisé',
    CouponDeleted = 'Coupon supprimé',
    Rename = 'Changement de pseudo',
    NoteModified = 'Note modifiée',
    NoteAdded = 'Note ajoutée',
    NoteRemoved = 'Note retirée',
    JoinRoleSet = "Rôle d'arrivée configuré",
    JoinRoleRemoved = "Rôle d'arrivée supprimé",
    ChannelCreate = 'création de salon',
    ChannelDelete = 'suppression de salon',
    ChannelEdit = 'Modification de salon',
    WebhookCreationFailed = 'Échec de création de webhook',
    RoleCreate = 'Création de rôle',
    RoleEdit = 'Modification de rôle',
    RoleDelete = 'Supression de rôle',
    MessageBulkDelete = 'Suppression de messages',
    Censor = 'Censuration',
    Tempban = 'Bannissement temporaire',
    Nuke = 'Nettoyage de salon',
    Demote = 'Destitution',
    DeleteReward = 'Suppression de récompense de niveau'
}

export type modlogs = {
    guild_id: string;
    mod_id: string;
    member_id: string;
    date: string;
    type: keyof typeof modActionType;
    reason: string;
    /**
     * Image URL
     *
     * Can be null
     */
    proof: string;
    /**
     * If it is an automod action (bot)
     *
     * Use `dbBool()` to get it as JS interpretable
     */
    autoMod: string;
    /**
     * If this log is deleted
     *
     * Use `dbBool()` to get is as boolean
     */
    deleted: string;
    /**
     * If the value has been edited
     *
     * Use `dbBool()` to get it as boolean
     */
    edited: string;
    /**
     * Last edited timestamp
     *
     * Can be null, depending of edited
     */
    lastEditedTimestamp: string;
    /**
     * Id of the case
     *
     * Generated by MySQL
     */
    case_id: string;
};

export type moduleType =
    | 'moderation'
    | 'giveaways'
    | 'economy'
    | 'fun'
    | 'utils'
    | 'misc'
    | 'config'
    | 'administration'
    | 'interchat'
    | 'level'
    | 'information'
    | 'tickets'
    | 'invitations';

export type modules = {
    /**
     * MySQL boolean
     *
     * Use `dbBool()` to decode it
     */
    [K in moduleType]: string;
} & {
    guild_id: string;
};
export type moduleDataType = {
    name: string;
    editable: boolean;
    default: boolean;
    emoji: string;
    id: moduleType;
};
export type configs = {
    [K in keyof configKeys]: string;
} & {
    guild_id: string;
};
export type jokes = {
    guild_id: string;
    global: number;
    dev: number;
    dark: number;
    limit: number;
    blondes: number;
    beauf: number;
};
export const defaultJokesTypes = {
    global: true,
    dev: true,
    blondes: true,
    beauf: true,
    dark: false,
    limit: false
} as Record<Exclude<keyof jokes, 'guild_id'>, boolean>;
export type ticketPanels<HasReference extends boolean = true> = {
    guild_id: string;
    channel_id: string;
    message_id: string;
    image: string | null;
    subject: string;
    description: string;
} & (HasReference extends true
    ? {
          /**
           * Primary key
           */
          reference: number;
      }
    : object);
export type ticketState = 'open' | 'closed';
export type ticketChannels = {
    guild_id: string;
    channel_id: string;
    message_id: string;
    /**
     * Référence à une reference de ticketPanels
     */
    panel_reference: number;
    user_id: string;
    state: ticketState;
    channelName: string;
};
export type ticketModRoles<T extends boolean = false> = {
    /**
     * Primary key
     */
    guild_id: string;
    roles: If<T, string[], string>;
};
export enum DatabaseTables {
    Tickets = 'tickets_channel',
    Panels = 'ticket_panels',
    ModRoles = 'ticket_modroles',
    Modlogs = 'modlogs',
    Coupons = 'coupons',
    Notes = 'notes',
    Cooldowns = 'cooldowns',
    JoinRoles = 'join_roles',
    Reminds = 'reminders',
    GBan = 'gban_list',
    Anonymous = 'anonymous',
    Shop = 'shops_list',
    Inventories = 'inventories',
    Passwords = 'passwords_storage',
    Loto = 'loto',
    Polls = 'polls',
    Plugboards = 'plugboards',
    Tasks = 'tasks',
    RoleReacts = 'roleReacts',
    LevelsList = 'levellists',
    LevelsRewards = 'levelsrewards',
    TempChannels = 'temp_channels',
    Invites = 'invitations',
    AFK = 'afks'
}
export type coupons = {
    guild_id: string;
    /**
     * Primary key
     */
    coupon: string;
    amount: number;
};
export type cooldowns = {
    guild_id: string;
    user_id: string;
    commandName: string;
    endsAt: number;
};
export type joinRoles = {
    guild_id: string;
    roles: string;
};
export type GBan = {
    user_id: string;
    date: string;
    reason: string;
};
export type Anonymous = {
    guild_id: string;
    channel_id: string;
    webhook_url: string;
    /**
     * MySQL JSON array
     */
    banned_roles: string;
    /**
     * MySQL JSON array
     */
    banned_users: string;
    id: number;
    name: string;
};
export type ShopItemType = 'role' | 'item';
export type ShopItem = {
    guild_id: string;
    itemType: ShopItemType;
    itemName: string;
    price: number;
    /**
     * If set to 0, it is infinite
     */
    quantity: 0 | number;
    quantityLeft: number;
    roleId: string;
    /**
     * Primary key
     */
    id: number;
};
export type InventoryItem = {
    name: string;
    quantity: number;
    value: number;
    roleId: 'none' | string;
    type: ShopItemType;
};
export type Inventory<Raw extends boolean = true, Identified extends boolean = false> = {
    guild_id: string;
    user_id: string;
    inventory: If<Raw, string, (InventoryItem & If<Identified, { id: number }, Record<string, never>>)[]>;
};
export type passwords = {
    user_id: string;
    input: string;
    value: string;
};
export type lotos<Raw extends boolean = false> = {
    id: number;
    guild_id: string;
    participants: If<Raw, string, [string, number[], number[]]>;
    coins: number;
    startedAt: string;
    endsAt: string;
    ended: If<Raw, number, boolean>;
    channel_id: string;
    numbers: number;
    complementaries: number;
};
export type polls<Raw extends boolean = false> = {
    guild_id: string;
    endsAt: If<Raw, string, number>;
    participants: If<Raw, string, string[]>;
    choices: If<Raw, string, { name: string; id: number; count: number }[]>;
    poll_id: number;
    started_by: string;
    message_id: string;
    channel_id: string;
    question: string;
    ended: If<Raw, string, boolean>;
    choosable: number;
};
export type plugboard<Raw extends boolean = false> = {
    user_id: string;
    plugboard: If<Raw, string, ConnectionMap>;
    name: string;
    id: number;
};
export type taskState = 'pending' | 'working' | 'closed' | 'done';
export type tasks<Raw extends boolean = false> = {
    guild_id: string;
    assignees: If<Raw, string, string[]>;
    state: taskState;
    opened_by: string;
    name: string;
    description: string;
    image: string | null;
    startedAt: If<Raw, string, number>;
    deadline: If<Raw, string, number | null>;
    channel_id: string;
    message_id: string;
    id: number;
};
export type levelRewardType = 'role' | 'coins';
export type levelRewards = {
    guild_id: string;
    type: levelRewardType;
    level: number;
    value: string;
    id: number;
};
export type tempChannelType = 'panel' | 'channel';
export type tempChannels = {
    guild_id: string;
    id: number;
    user_id: string;
    channel_id: string;
    type: tempChannelType;
    parent: string;
    name: string;
};
export type invitations<Raw extends boolean = false> = {
    guild_id: string;
    user_id: string;
    invited: If<Raw, string, string[]>;
    total: If<Raw, string, number>;
    leaves: If<Raw, string, number>;
    fakes: If<Raw, string, number>;
    bonus: If<Raw, string, number>;
};
export type afk<Raw extends boolean = false> = {
    user_id: string;
    reason: string;
    afkat: If<Raw, string, number>;
};
export type poolOptions = { pools?: number };
