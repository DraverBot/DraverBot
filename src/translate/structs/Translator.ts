import { readdirSync } from 'node:fs';
import { langResolvable } from '../../typings/core';
import { BaseInteraction, Message } from 'discord.js';
import { util } from '../../utils/functions';

export class Translator {
    private defaultLang: string;
    private dict: Record<string, any>;

    constructor(defaultLang: string) {
        this.defaultLang = defaultLang;

        this.start();
    }

    public resolveLang(resolvable: langResolvable): string {
        if (resolvable instanceof Message) return resolvable.guild?.preferredLocale;
        if (resolvable instanceof BaseInteraction) return resolvable?.locale;
        return resolvable;
    }
    public translate(key: string, lang: langResolvable, opts: Record<string, string | number> = {}): string {
        const translation = this.resolveLang(lang);

        const path = key.split('.');
        let value = Object.keys(this.dict).includes(translation) ? this.dict[translation] : this.dict[this.defaultLang];

        for (const section of path) {
            if (value[section]) value = value[section];
            else {
                value = null;
                break;
            }
        }
        if (!value || value instanceof Object) return null;

        const content = ((input: string) => {
            const regexes = Object.entries(opts)
                .map(([k, v]) => [new RegExp(`{${k}}`, 'g'), typeof v === 'number' ? v.toLocaleString(translation) : v])
                .concat([[/{coins}/g, util('coins')]]) as [RegExp, string][];
            regexes.forEach(([r, v]) => {
                input = input.replace(r, v);
            });

            return input;
        })(value as string);
        return content;
    }

    private start() {
        readdirSync(this.join('langs')).forEach((lang) => {
            readdirSync(this.join('langs', lang)).forEach((folder) => {
                readdirSync(this.join('langs', lang, folder)).forEach((subFolder) => {
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
