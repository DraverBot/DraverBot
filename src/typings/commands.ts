import { ChannelType, ChatInputApplicationCommandData } from 'discord.js';
import { moduleType } from './database';
import { commandOptions } from 'amethystjs';

export enum AdminLevelAddType {
    Messages = 'messages',
    Level = 'level'
}
export enum ShifumiSigns {
    Rock = 'pierre',
    Paper = 'feuille',
    Scisors = 'ciseaux'
}
export type shifumiSign<T extends ShifumiSigns = ShifumiSigns> = { emoji: string; key: T; name: string };
type shifumiSignsType<T extends ShifumiSigns = ShifumiSigns> = Record<T, shifumiSign<T>>;

export const shifumiSigns: shifumiSignsType = {
    feuille: {
        emoji: '✋',
        key: ShifumiSigns.Paper,
        name: 'feuille'
    },
    pierre: {
        emoji: '✊',
        key: ShifumiSigns.Rock,
        name: 'pierre'
    },
    ciseaux: {
        emoji: '✌️',
        key: ShifumiSigns.Scisors,
        name: 'ciseaux'
    }
};
export enum GWListType {
    All = 'tous',
    Ended = 'terminés',
    Current = 'en cours'
}
export enum EmbedBtnIds {
    Title = 'embed.title',
    Description = 'embed.description',
    FooterText = 'embed.footer-text',
    FooterImage = 'embed.footer-image',
    Thumbnail = 'embed.thumbnail',
    Image = 'embed.image',
    URL = 'embed.url',
    AuthorText = 'embed.author-text',
    AuthorImage = 'embed.author-image',
    Timestamp = 'embed.timestamp',
    Field = 'embed.field',
    Color = 'embed.color',
    Send = 'embed.send',
    RemoveField = 'embed.remove-field'
}
export const ChannelCreateChannelTypeOptions = [
    {
        name: 'Textuel',
        value: ChannelType.GuildText
    },
    {
        name: 'Vocal',
        value: ChannelType.GuildVoice
    },
    {
        name: 'Conférence',
        value: ChannelType.GuildStageVoice
    },
    {
        name: 'Catégorie',
        value: ChannelType.GuildCategory
    },
    {
        name: 'Annonces',
        value: ChannelType.GuildAnnouncement
    },
    {
        name: 'Forum',
        value: ChannelType.GuildForum
    }
];
export enum ChannelMoveSens {
    Up = 'channel.move.up',
    Down = 'channel.move.down'
}
export enum RewardsFilter {
    All = 'cmd.rewards.level.filter.all',
    Coins = 'cmd.rewards.level.filter.coins',
    Role = 'cmd.rewards.level.filter.role'
}
export type draverCommandOptions = commandOptions & { module: moduleType | 'dev' } & ChatInputApplicationCommandData;
