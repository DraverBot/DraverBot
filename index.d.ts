import { commandOptions as opts, AmethystCommand as CMD } from "amethystjs"

declare module 'amethystjs' {
    type commandOptions = opts & { module: string };
    class AmethystCommand extends CMD {

    }
}