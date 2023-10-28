import { CaesarTypes, VigenereType } from '../typings/ciphers';

export const inputLetters = () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"\'{}[]\\/,?;.:/!§*$£ù%^¨1234567890#~<>-+@_&= ';

export const IsValidInput = (input: string): boolean => {
    const letters = inputLetters().split('');
    const inputs = input.split('');

    return !inputs.some((x) => !letters.includes(x));
};
export const caesarCryptor = ({ input, sens = 'alphabetic', gap, alphabet = inputLetters() }: CaesarTypes): string => {
    let crypted = '';
    for (const ch of input) {
        const initialPosition = alphabet.indexOf(ch);

        const k = sens === 'alphabetic' ? 1 : -1;
        const nextIndex = (initialPosition + alphabet.length + k * gap) % alphabet.length;

        crypted += alphabet[nextIndex % alphabet.length];
    }
    return crypted;
};
export const caesarDecryptor = ({
    input,
    sens = 'alphabetic',
    gap,
    alphabet = inputLetters()
}: CaesarTypes): string => {
    let crypted = '';
    for (const ch of input) {
        const initialPosition = alphabet.indexOf(ch);

        const k = sens === 'alphabetic' ? -1 : 1;
        const nextIndex = (initialPosition + alphabet.length + k * gap) % alphabet.length;

        crypted += alphabet[nextIndex % alphabet.length];
    }
    return crypted;
};
export const vigenereCipher = ({ input, key, alphabet = inputLetters() }: VigenereType) => {
    let ciphered = '';
    let keyIndex = 0;

    for (const ch of input) {
        const index = alphabet.indexOf(ch) + alphabet.indexOf(key[keyIndex]) + alphabet.length;
        keyIndex = (keyIndex + 1) % key.length;

        ciphered += alphabet[index % alphabet.length];
    }

    return ciphered;
};
export const vigenereDecipher = ({ input, key, alphabet = inputLetters() }: VigenereType) => {
    let ciphered = '';
    let keyIndex = 0;

    for (const ch of input) {
        const index = alphabet.indexOf(ch) - alphabet.indexOf(key[keyIndex]) + alphabet.length;
        keyIndex = (keyIndex + 1) % key.length;

        ciphered += alphabet[index % alphabet.length];
    }

    return ciphered;
};
