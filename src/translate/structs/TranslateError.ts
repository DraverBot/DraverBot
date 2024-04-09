export class TranslateError extends Error {
    constructor(message: string, path: {
        full: string;
        erroring: string;
    }) {
        super(message, {
            cause: `Path blocked on ${path.erroring}\nFull path: ${path.full}`
        })
    }
}