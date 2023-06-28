export class Process<T extends any[], U> {
    private _method: (...any: T) => U;
    private _name: string;

    constructor(name: string, method: (...any: T) => U) {
        this._name = name;
        this._method = method;
    }

    public get name() {
        return this._name;
    }
    public get method() {
        return this._method;
    }
    public process(...args: T) {
        return this._method(...args);
    }
}
