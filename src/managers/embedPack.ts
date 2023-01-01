import { ColorResolvable, EmbedBuilder } from 'discord.js';
import { util } from '../utils/functions';
import { notNull } from '../utils/toolbox';

export class EmbedPackage {
    private _options: { defaultColor: boolean };
    private _embed: EmbedBuilder = new EmbedBuilder();

    constructor(options?: { defaultColor?: boolean }) {
        this._options = { defaultColor: options?.defaultColor ?? false };

        if (this._options.defaultColor) this._embed.setColor(util('accentColor'));
    }
    public setTitle(str: string) {
        return this._embed.setTitle(str);
    }
    public setDescription(str: string) {
        return this._embed.setDescription(str);
    }
    public setAuthorText(str: string) {
        return this._embed.setAuthor({ name: str, iconURL: this._embed.data?.author?.icon_url });
    }
    public setAuthorImage(url: string) {
        return this._embed.setAuthor({ name: this._embed.data?.author?.name, iconURL: url });
    }
    public setColor(color: ColorResolvable) {
        return this._embed.setColor(color);
    }
    public setImage(url: string | null) {
        return this._embed.setImage(url);
    }
    public setField(fieldData: { name: string; value: string; inline: boolean }) {
        return this._embed.addFields(fieldData);
    }
    public removeField(name: string) {
        const index = this._embed.data.fields?.indexOf(this._embed.data.fields?.find((x) => x.name === name));
        this._embed.spliceFields(index, 1);
        return this._embed;
    }
    public setFooterName(name: string) {
        return this._embed.setFooter({ text: name, iconURL: this._embed?.data?.footer?.icon_url });
    }
    public setFooterImage(url: string) {
        return this._embed.setFooter({ text: this._embed.data?.footer?.text, iconURL: url });
    }
    public setTimestamp(enabled: boolean) {
        if (enabled) return this._embed.setTimestamp(Date.now());
        if (notNull(this._embed.data.timestamp)) return this._embed.setTimestamp();
        return this._embed;
    }
    public setThumbnail(url: string | null) {
        return this._embed.setThumbnail(url);
    }
    public setURL(url: string | null) {
        return this._embed.setURL(url);
    }
    public get embed() {
        return this._embed;
    }
    public get options() {
        return this._options;
    }
}
