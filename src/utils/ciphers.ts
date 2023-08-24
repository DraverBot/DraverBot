import { CaesarTypes, VigenereType } from '../typings/ciphers';

export const inputLetters = () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"\'{}[]\\/,?;.:/!§*$£ù%^¨1234567890#~<>-+@_&= ';

export const IsValidInput = (input: string): boolean => {
    const letters = inputLetters().split('');
    const inputs = input.split('');

    return !inputs.some((x) => !letters.includes(x));
};
export const caesarCryptor = ({ input, sens = 'alphabetic', gap }: CaesarTypes): string => {
    let crypted = '';
    for (const ch of input) {
        const initialPosition = inputLetters().indexOf(ch);

        const k = sens === 'alphabetic' ? 1 : -1;
        const nextIndex = (initialPosition + inputLetters().length + k * gap) % inputLetters().length;

        crypted += inputLetters()[nextIndex % inputLetters().length];
    }
    return crypted;
};
export const caesarDecryptor = ({ input, sens = 'alphabetic', gap }: CaesarTypes): string => {
    let crypted = '';
    for (const ch of input) {
        const initialPosition = inputLetters().indexOf(ch);

        const k = sens === 'alphabetic' ? -1 : 1;
        const nextIndex = (initialPosition + inputLetters().length + k * gap) % inputLetters().length;

        crypted += inputLetters()[nextIndex % inputLetters().length];
    }
    return crypted;
};
export const vigenereCipher = ({ input, key }: VigenereType) => {
    let ciphered = '';
    let keyIndex = 0;

    for (const ch of input) {
        const index = inputLetters().indexOf(ch) + inputLetters().indexOf(key[keyIndex]) + inputLetters().length;
        keyIndex = (keyIndex + 1) % key.length;

        ciphered += inputLetters()[index % inputLetters().length];
    }

    return ciphered;
};
export const vigenereDecipher = ({ input, key }: VigenereType) => {
    let ciphered = '';
    let keyIndex = 0;

    for (const ch of input) {
        const index = inputLetters().indexOf(ch) - inputLetters().indexOf(key[keyIndex]) + inputLetters().length;
        keyIndex = (keyIndex + 1) % key.length;

        ciphered += inputLetters()[index % inputLetters().length];
    }

    return ciphered;
};
