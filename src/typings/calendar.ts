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
export enum CalendarTables {
    storage = 'calendar_storage'
}
export type openReturn = 'ok' | 'no day' | 'already claimed';
export type importReturn = 'not array' | 'not 24' | 'duplicate entries' | 'already defined' | 'ok';
