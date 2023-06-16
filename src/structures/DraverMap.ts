type MapElement<Key, Value> = { key: Key; value: Value; lastSet: Date };

export class DraverMap<Key = any, Value = any> {
    private idleTime: number = 60 * 60 * 1000;
    private datas: MapElement<Key, Value>[] = [];

    constructor(options?: { idleTime?: number }) {
        this.idleTime = options?.idleTime ?? this.idleTime;

        this.start();
    }

    private index(key: Key): number {
        return this.datas.indexOf(this.datas.find((x) => x.key === key));
    }
    private edit(key: Key, value: Value): this {
        if (!this.has(key)) return this;

        const index = this.index(key);
        this.datas[index] = this.objectData(key, value);

        return this;
    }
    private objectData(key: Key, value: Value): MapElement<Key, Value> {
        return {
            key,
            value,
            lastSet: new Date()
        };
    }
    public get(key: Key): Value | undefined {
        return this.datas.find((x) => x.key === key)?.value;
    }
    public has(key: Key): boolean {
        if (this.datas.find((x) => x.key === key)) return true;
        return false;
    }
    public delete(key: Key): boolean {
        const has = this.has(key);
        this.datas = this.datas.filter((x) => x.key !== key);

        return has;
    }
    public set(key: Key, value: Value): this {
        if (!this.has(key)) {
            this.datas.push(this.objectData(key, value));
        } else {
            this.edit(key, value);
        }

        const now = Date.now() + this.idleTime;

        setTimeout(() => {
            if (Math.floor(now / 1000) !== Math.floor(Date.now() / 1000)) return;

            this.delete(key);
        }, this.idleTime);

        return this;
    }

    public get entries() {
        return this.datas.map((x) => ({ key: x.key, value: x.value }));
    }

    private start() {}
}
