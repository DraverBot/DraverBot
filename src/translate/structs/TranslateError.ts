export class TranslateError extends Error {
    public data: {full: string; erroring: string; lang: string}

    constructor(message: string, path: {
        full: string;
        erroring: string;
        lang: string;
    }) {
        super(message, {
            cause: `Path blocked on ${path.erroring}\nFull path: ${path.lang}.${path.full}`
        })
        this.data = path
    }
}