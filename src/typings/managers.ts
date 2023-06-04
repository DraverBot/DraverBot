import { Guild, If, TextChannel, User } from 'discord.js';
import { commandName } from './functions';

export type IfNot<Condition extends boolean, A, B = null> = Condition extends false
    ? A
    : Condition extends true
    ? B
    : A;

export type interserver = {
    guild_id: string;
    frequence: string;
    channel_id: string;
    webhook: string;
};
export type levels<DataType = string> = {
    guild_id: string;
    user_id: string;
    messages: DataType;
    level: DataType;
    required: DataType;
};
export type createTicketOptions<IsPanel extends boolean> = {
    guild: Guild;
    user: User;
    panel_id?: If<IsPanel, number, null>;
    subject?: If<IsPanel, null, string>;
    description?: IfNot<IsPanel, string>;
};

export type closeTicketOptions = {
    guild: Guild;
    user: User;
    message_id: string;
};
export type reopenTicketOptions = {
    guild: Guild;
    user: User;
    message_id: string;
};
export type createPanelOptions = {
    guild: Guild;
    image?: string;
    description?: string;
    subject: string;
    channel: TextChannel;
    user: User;
};
export enum ticketButtonIds {
    Close = 'ticket.close',
    Open = 'ticket.open',
    Mention = 'ticket.mention',
    Reopen = 'ticket.reopen',
    Save = 'ticket.save',
    Delete = 'ticket.delete',
    Panel = 'ticket.panel'
}
export type deletePanelOptions = {
    guild: Guild;
    user: User;
    message_id: string;
};
export type CooldownsInputOptions = {
    guild_id: string;
    user_id: string;
    commandName: commandName;
};

export type RemindsPlaceType = 'mp' | 'achannel';
export type reminds = {
    user_id: string;
    place: RemindsPlaceType;
    channel_id: string | null;
    reason: string;
    at: number;
    id: number;
    setDate: string;
};
export enum ShopManagerErrorReturns {
    EmptyStock = 'Rupture de stock',
    NotEnoughCoins = 'Pas assez de pièces',
    ItemNotFound = 'Item introuvable',
    ItemAlreadyExist = "L'item existe déjà"
}
export type lotoCollectionParticipants = {
    userId: string;
    numbers: number[];
    complementaries: number[];
}[];

export type lotoCollection = {
    id: string;
    guildId: string;
    participants: lotoCollectionParticipants;
    startedAt: string;
    endsAt: string;
    coins: number;
    ended: boolean;
    numbers: number;
    complementaries: number;
    channelId: string;
};
