import { Collection, If } from 'discord.js';

export type calendarDay = {
    day: number;
    reward: string;
};
export type calendarCache = Collection<number, calendarDay>;
export type calendarUser = { id: string; days: number[] };
export type calendarStorage = calendarUser[];

export type calendarDatabase<Raw extends boolean> = {
    days: If<Raw, string, calendarCache>;
    storage: If<Raw, string, calendarStorage>;
};
export enum ChristmasTables {
    storage = 'calendar_storage',
    gallery = 'christmas_gallery'
}
export type openReturn = 'ok' | 'no day' | 'already claimed';
export type importReturn = 'not array' | 'not 24' | 'duplicate entries' | 'already defined' | 'ok';
export enum cardAvatarPos {
    TopLeft = 'top left',
    TopRight = 'top right',
    TopCenter = 'top middle',
    CenterLeft = 'middle left',
    CenterRight = 'middle right',
    Center = 'middle middle',
    BottomLeft = 'bottom left',
    BottomRight = 'bottom right',
    BottomCenter = 'bottom middle'
}
export type galleryArt<R extends boolean = false> = {
    url: string;
    user: string;
    post_date: If<R, string, number>;
    name: string;
};
