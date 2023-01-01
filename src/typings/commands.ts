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
