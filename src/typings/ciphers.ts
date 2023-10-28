export type CaesarTypes = {
    input: string;
    gap: number;
    sens?: 'reversed' | 'alphabetic';
    alphabet?: string;
};
export type VigenereType = {
    input: string;
    key: string;
    alphabet?: string;
};
export type DraverType = {
    input: string;
    key: string;
};
