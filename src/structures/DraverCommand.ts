import { AmethystCommand, commandOptions } from 'amethystjs';
import { ChatInputApplicationCommandData } from 'discord.js';
import { draverCommandOptions } from '../typings/commands';
import { moduleType } from '../typings/database';

export class DraverCommand extends AmethystCommand {
    private _module: moduleType | 'dev';

    constructor(options: draverCommandOptions) {
        super(options as commandOptions & ChatInputApplicationCommandData);
        this._module = options.module;
    }

    public get module() {
        return this._module;
    }
}
declare module 'amethystjs' {
    interface AmethystCommand {
        module: moduleType | 'dev';
    }
}
