import { Guild, If, TextChannel, User } from "discord.js";

export type IfNot<Condition extends boolean, A extends any, B extends any = null> = Condition extends false ? A : Condition extends true ? B : A;

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
export type createTicketOptions<IsPanel extends boolean> = {
    guild: Guild;
    user: User;
    panel_id: If<IsPanel, number, null>;
    subject: IfNot<IsPanel, string>;
    description?: IfNot<IsPanel, string>
};

export type closeTicketOptions = {
    guild: Guild;
    user: User;
    message_id: string;
}
export type reopenTicketOptions = {
    guild: Guild;
    user: User;
    message_id: string;
}
export type createPanelOptions = {
    guild: Guild;
    image?: string;
    description?: string;
    subject: string;
    channel: TextChannel;
    user: User;
}
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
}
