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
