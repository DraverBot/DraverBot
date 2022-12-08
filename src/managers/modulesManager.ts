import { Collection } from "discord.js";
import { modulesData } from "../data/modulesData";
import { modules, moduleType } from "../typings/database";
import query from "../utils/query";
import { dbBool } from "../utils/toolbox";

type modulesManager = {
    [K in moduleType]: boolean
} & {
    guild_id: string;
}

export class ModulesManager {
    private cache: Collection<string, modulesManager> = new Collection();

    constructor() {
        this.start()
    }

    public enabled(guild_id: string, module: moduleType) {
        return (this.cache.get(guild_id) ?? {})[module] ?? this.getDefaultValue(module);
    }

    public setState({ guild_id, module, state }: { guild_id: string; module: moduleType; state: boolean }): Promise<boolean> {
        return new Promise(async(resolve) => {
            const dt = {
                ...(this.cache.get(guild_id) ?? this.defaultObject),
                guild_id: guild_id,
            }
            dt[module] = state;
    
            this.cache.set(guild_id, dt);

            const res = await query(this.makeQuery(guild_id));
            resolve(res ? true : false);
        })
    }
    public getServerDatas(guild_id: string): modulesManager | undefined {
        return this.cache.get(guild_id);
    }

    public getDefaultValue(module: moduleType) {
        return modulesData[Object.keys(modulesData).find((x: moduleType) => x === module)].default;
    }

    public get defaultObject(): Record<moduleType, boolean> {
        const obj = {}
        Object.keys(modulesData).forEach((x: moduleType) => {
            obj[x] = modulesData[x].default
        });
    
        return obj as Record<moduleType, boolean>;
    }

    public start() {
        this.fillCache();
    }
    private makeQuery(guild_id: string) {
        const dt = this.cache.get(guild_id);

        return `REPLACE INTO test (${Object.keys(dt).join(', ')}) VALUES (${Object.keys(dt).map(x => `"${typeof x == 'string' ? x : x ? '0' : '1'}"`).join(', ')})`;
    }
    private async fillCache() {
        const datas = await query<modules>(`SELECT * FROM modules`)
        for (const data of datas) {
            const dt = {};
            Object.keys(data).filter(x => !x.includes('_')).forEach((key: moduleType) => {
                dt[key] = dbBool(data[key])
            })
            this.cache.set(data.guild_id, dt as modulesManager);
        }
    }
}
