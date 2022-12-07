import { AmethystCommand, commandOptions } from "amethystjs";
import { ChatInputApplicationCommandData } from "discord.js";

export class Command extends AmethystCommand {
    declare public readonly options: commandOptions & ChatInputApplicationCommandData & { module: string };

    constructor(options: commandOptions & ChatInputApplicationCommandData) {
        super(options);
        this.options = options
    }
}