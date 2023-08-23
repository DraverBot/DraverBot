import { Collection } from 'discord.js';
import { WordGenerator } from './Generator';
import query from '../utils/query';
import { DatabaseTables, passwords } from '../typings/database';
import { sqliseString } from '../utils/toolbox';

export class PasswordManager {
    private _cache: Collection<string, { name: string; password: string }[]> = new Collection();

    constructor() {
        this.start();
    }

    public encrypt(input: string, key: string, method: 'K' | 'V') {
        let crypted = '';

        if (method === 'V') {
            for (let i = 0, j = 0; i < input.length; i++, j = (j + 1) % key.length) {
                const charIndex = this.chars.indexOf(input[i]);
                const shiftIndex = this.chars.indexOf(key[j]);
                const shiftedChar =
                    // eslint-disable-next-line prettier/prettier
                    this.chars[(charIndex + shiftIndex * this.calculatePropreties(key).valueSens) % this.chars.length];
                crypted += shiftedChar;
            }

            return crypted;
        }
        if (method === 'K') {
            for (const ch of input) {
                let cr: string;
                const initialPosition = this.chars.indexOf(ch);

                const { sens, gap } = this.calculatePropreties(key);

                if (sens === 'alphabetic') {
                    cr = this.chars[initialPosition + gap];
                    if (!cr) cr = this.chars[this.chars.length - (initialPosition + gap)];
                } else {
                    cr = this.chars[initialPosition - gap];
                    if (!cr) cr = this.chars[this.chars.length - (initialPosition - gap) - 1];
                }
                crypted += cr;
            }
        }

        return crypted;
    }
    public decrypt(input: string, key: string, method: 'K' | 'V') {
        let crypted = '';

        if (method === 'V') {
            for (let i = 0, j = 0; i < input.length; i++, j = (j + 1) % key.length) {
                const charIndex = this.chars.indexOf(input[i]);
                const shiftIndex = this.chars.indexOf(key[j]);
                const shiftedChar =
                    this.chars[
                        // eslint-disable-next-line prettier/prettier
                        (charIndex - shiftIndex * this.calculatePropreties(key).valueSens + this.chars.length) %
                            this.chars.length
                    ];
                crypted += shiftedChar;
            }
        }
        if (method === 'K') {
            for (const ch of input) {
                let cr: string;
                const initialPosition = this.chars.indexOf(ch);

                const { sens, gap } = this.calculatePropreties(key);

                if (sens === 'alphabetic') {
                    cr = this.chars[initialPosition - gap];
                    if (!cr) cr = this.chars[this.chars.length + (initialPosition - gap)];
                } else {
                    cr = this.chars[initialPosition + gap];
                    if (!cr) cr = this.chars[this.chars.length - (initialPosition - gap) + 1];
                }
                crypted += cr;
            }
        }

        return crypted;
    }
    private calculatePropreties(key: string) {
        const sens = parseInt(key[0]) > 5 ? 'alphabetic' : 'reversed';
        const gap = (parseInt(key[0]) + 1) * (key[1] === '0' ? 2 : parseInt(key[3]) + 1);
        const valueSens = parseInt(key[5]) > parseInt(key[6]) ? 1 : -1;

        return { sens, gap, valueSens };
    }
    public get chars() {
        return new WordGenerator({
            capitals: true,
            includeSpaces: true,
            letters: true,
            special: true,
            numbers: true,
            length: 1
        }).letters;
    }

    private start() {
        this.fillCache();
    }

    private async fillCache() {
        const datas = await query<passwords>(`SELECT * FROM ${DatabaseTables.Passwords}`);

        this._cache.clear();
        datas.forEach((data) => {
            if (!this._cache.has(data.user_id)) this._cache.set(data.user_id, []);
            const x = this._cache.get(data.user_id);

            x.push({ name: data.input, password: data.value });

            this._cache.set(data.user_id, x);
        });
    }

    public getPassword(userId: string, sectionName: string) {
        if (!this._cache.has(this.encrypt(userId, userId, 'K'))) return undefined;

        const passwords = this._cache.get(this.encrypt(userId, userId, 'K'));
        const password = passwords.find((x) => x.name === sectionName)?.password;
        if (!password) return password;

        return this.decrypt(password, userId, 'V');
    }
    public printPassword(userId: string, name: string, password: string) {
        if (!this._cache.has(this.encrypt(userId, userId, 'K'))) this._cache.set(this.encrypt(userId, userId, 'K'), []);
        const list = this._cache.get(this.encrypt(userId, userId, 'K'));
        let has = false;

        if (list.find((x) => x.name === name)) {
            has = true;
            list.splice(list.indexOf(list.find((x) => x.name === name)), 1);
        }

        list.push({
            name,
            password: this.encrypt(password, userId, 'V')
        });
        this._cache.set(this.encrypt(userId, userId, 'K'), list);
        query(
            has
                ? `UPDATE ${DatabaseTables.Passwords} SET value="${sqliseString(
                      this.encrypt(password, userId, 'V')
                  )}" WHERE user_id="${sqliseString(this.encrypt(userId, userId, 'K'))}" AND input="${name}"`
                : `INSERT INTO ${DatabaseTables.Passwords} ( user_id, input, value ) VALUES ( "${sqliseString(
                      this.encrypt(userId, userId, 'K')
                  )}", "${sqliseString(name)}", "${sqliseString(this.encrypt(password, userId, 'V'))}" )`
        );
    }
    public getPasswords(userId: string) {
        return this._cache.get(this.encrypt(userId, userId, 'K'));
    }
    public deletePassword(userId: string, name: string) {
        if (!this.getPassword(userId, name)) return true;

        const passwords = this.getPasswords(userId);
        passwords.splice(passwords.indexOf(passwords.find((x) => x.name === name)), 1);

        query(
            `DELETE FROM ${DatabaseTables.Passwords} WHERE input="${sqliseString(name)}" AND user_id="${sqliseString(
                this.encrypt(userId, userId, 'K')
            )}"`
        );
        this._cache.set(this.encrypt(userId, userId, 'K'), passwords);

        return true;
    }

    public get cache() {
        return this._cache;
    }
}
