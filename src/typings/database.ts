import { configKeys } from "../data/configData";

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
    LevelReset = 'Réinitialisation de niveaux'
}

export type modlogs = {
    guild_id: string;
    mod_id: string;
    member_id: string;
    date: string;
    type: modActionType;
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
    | 'tickets';

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
};
export type configs = {
    [K in keyof configKeys]: string;
} & {
    guild_id: string;
}
