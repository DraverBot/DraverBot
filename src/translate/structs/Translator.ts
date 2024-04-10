import { readdirSync } from 'node:fs';
import { langResolvable } from '../../typings/core';
import { BaseInteraction, LocalizationMap, Message } from 'discord.js';
import { util } from '../../utils/functions';
import { TranslateError } from './TranslateError';

export class Translator {
    private _defaultLang: string;
    private dict: Record<string, any> = {};

    constructor(defaultLang: string) {
        this._defaultLang = defaultLang;

        this.start();
    }

    public get defaultLang() {
        return this._defaultLang;
    }
    private resolve(key: string, lang: string) {
        const path = key.split('.');
        let value = Object.keys(this.dict).includes(lang) ? this.dict[lang] : this.dict[this._defaultLang];

        for (const section of path) {
            if (value[section]) value = value[section];
            else {
                throw new TranslateError('Invalid path', {
                    full: key,
                    lang,
                    erroring: section
                });
                value = null;
                break;
            }
        }

        return value;
    }
    public commandData(key: string): {
        name: string;
        description: string;
        nameLocalizations: LocalizationMap;
        descriptionLocalizations: LocalizationMap;
    } {
        const defaultSet = this.resolve(key, this._defaultLang);
        const data = {
            name: defaultSet.name,
            description: defaultSet.description,
            nameLocalizations: {},
            descriptionLocalizations: {}
        };

        Object.keys(this.dict).forEach((lang) => {
            const set = this.resolve(key, lang);

            data.nameLocalizations[lang] = set.name;
            data.descriptionLocalizations[lang] = set.description;
        });

        return data;
    }
    public resolveLang(resolvable: langResolvable): string {
        if (resolvable instanceof Message) return resolvable.guild?.preferredLocale;
        if (resolvable instanceof BaseInteraction) return resolvable?.locale;
        if (resolvable === 'default') return this._defaultLang;
        return resolvable;
    }
    public translate(key: string, lang: langResolvable, opts: Record<string, string | number> = {}): string {
        const translation = this.resolveLang(lang);

        const value = this.resolve(key, translation);
        if (!value || value instanceof Object) {
            throw new TranslateError('Invalid path', {
                full: key,
                erroring: 'Unknown',
                lang: translation
            });
        }

        const content = ((input: string) => {
            const regexes = Object.entries(opts)
                .map(([k, v]) => [new RegExp(`{${k}}`, 'g'), typeof v === 'number' ? v.toLocaleString(translation) : v])
                .concat(this.includedRegexes) as [RegExp, string][];
            regexes.forEach(([r, v]) => {
                input = input.replace(r, v);
            });

            return input;
        })(value as string);
        return content;
    }
    private get includedRegexes(): [RegExp, string][] {
        return [
            [/{coins}/g, util('coins')],
            [/{support}/g, util('support')],
            [/{email}/g, util('email')]
        ];
    }

    private start() {
        readdirSync(this.join('langs')).forEach((lang) => {
            if (!this.dict[lang]) this.dict[lang] = {};
            readdirSync(this.join('langs', lang)).forEach((folder) => {
                if (!this.dict[lang][folder]) this.dict[lang][folder] = {};
                readdirSync(this.join('langs', lang, folder)).forEach((subFolder) => {
                    if (!this.dict[lang][folder][subFolder]) this.dict[lang][folder][subFolder] = {};
                    readdirSync(this.join('langs', lang, folder, subFolder)).forEach((fileName) => {
                        const content = require(`../langs/${lang}/${folder}/${subFolder}/${fileName}`);

                        this.dict[lang][folder][subFolder][fileName.replace(/\.json/, '')] = content;
                    });
                });
            });
        });
    }
    private join(...paths: string[]) {
        return `dist/translate/${paths.join('/')}`;
    }
}
