export type colorId = 'green' | 'blue' | 'white' | 'black' | 'red' | 'orange' | 'yellow' | 'brown';
export type colorType = {
    id: colorId;
    name: string;
    emoji: string;
};
export type pinId = 'correct' | 'good';
export type pinType = {
    id: pinId;
    emoji: string;
};
export type callbackType = (
    state: 'win' | 'loose',
    board: { input: colorId[]; res: pinId[] }[],
    combination: colorId[]
) => any;
