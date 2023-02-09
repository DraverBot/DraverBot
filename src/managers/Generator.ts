type dataType = {
    letters?: boolean;
    capitals?: boolean;
    numbers?: boolean;
    special?: boolean;
    includeSpaces?: boolean;
    overload?: string;
    length: number;
    charsToRemove?: string;
};

export class WordGenerator {
    private _letters: string;
    public readonly data: dataType;
    private size: number;

    constructor(data: dataType) {
        this._letters = '';
        this.data = data;
        this.size = data.length || 16;

        this.init();
    }

    private init() {
        if (this.data.letters == true) this._letters = 'abcdefghijklmnopqrstuvwx';
        if (this.data.capitals == true) this._letters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (this.data.numbers == true) this._letters += '0123456789';
        if (this.data.special == true) this._letters += '+×÷=/_€£¥₩!@#$%^&*()-:;,?`~|<>{}[]]}';
        if (this.data.includeSpaces == true) this._letters += ' ';

        if (this.data.overload !== undefined && Array.isArray(this.data.overload)) {
            for (let i = 0; i < this.data.overload.length; i++) {
                const charact = this.data.overload[i];
                if (!this._letters.includes(charact)) this._letters += charact;
            }
        }
        if (this.data.charsToRemove !== undefined && Array.isArray(this.data.charsToRemove)) {
            for (const char of this.data.charsToRemove) {
                this._letters = this._letters.replace(char, '');
            }
        }
    }
    public generate() {
        this.init();

        let word = '';
        for (let i = 0; i < this.size; i++) {
            const charact = this._letters[Math.floor(Math.random() * this._letters.length)];

            word += charact;
        }

        return word;
    }
    public get letters() {
        return this._letters;
    }
}
