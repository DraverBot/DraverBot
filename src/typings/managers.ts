import { Guild, User } from "discord.js";

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
export enum ticketsTable {
    Tickets = 'tickets_channel',
    Panels = 'ticket_panels',
    ModRoles = 'ticket_modroles'
}
export type createTicketOptions = {
    guild: Guild;
    user: User;
    panel_id: number;
}
export type closeTicketOptions = {
    guild: Guild;
    user: User;
    message_id: string;
}
export enum createTicketIds {
    Close = 'ticket.close',
    Open = 'ticket.open',
    Mention = 'ticket.mention',
    Reopen = 'ticket.reopen',
    Save = 'ticket.save',
    Delete = 'ticket.delete'
}
