import { If } from 'discord.js';

export type roleReactType = 'buttons' | 'selectmenu';
export type roleReactButtonType = {
    name: string;
    emoji: string;
    role_id: string;
    type: roleReactType;
};

export type roleReacts<Raw extends boolean = true> = {
    guild_id: string;
    channel_id: string;
    message_id: string;
    title: string;
    description: string;
    image: string | '';
    type: roleReactType | 'both';
    ids: If<Raw, string, roleReactButtonType[]>;
    id: number;
};
