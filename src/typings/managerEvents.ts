import { TextChannel } from 'discord.js';
import { giveaway } from './giveaway';
import { Connection } from 'mysql';

export type ManagerEvents = {
    giveawayStarted: [giveaway: giveaway, channel: TextChannel, user: string];
    giveawayRerolled: [giveaway: giveaway, channel: TextChannel, oldWinners: string[], newWinners: string[]];
    giveawayEnded: [giveaway: giveaway, channel: TextChannel, winners: string[]];
};
export type ManagerListeners<K extends keyof ManagerEvents> = {
    event: K;
    run: (...args: ManagerEvents[K]) => void | unknown;
};
export type databaseMode = 'json' | 'mysql';
export type MySQLDatabase = {
    mode: 'mysql';
    connection: Connection;
};
export type JSONDatabase = {
    mode: 'json';
    path: `./${string}`;
    file: null;
};

export type databaseOptions<Mode extends databaseMode> = {
    mode: Mode;
} & (Mode extends 'json'
    ? { path: `./${string}.json` }
    : Mode extends 'mysql'
      ? { connection: Connection }
      : Record<string, never>);
export type Database<Mode extends databaseMode> = Mode extends 'json' ? JSONDatabase : MySQLDatabase;
