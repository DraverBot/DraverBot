import { AmethystEvent } from "amethystjs";
import { ModulesManager } from "../managers/modulesManager";
import { checkDatabase } from "../utils/functions";

export default new AmethystEvent('ready', async(client) => {
    await checkDatabase();

    client.modulesManager = new ModulesManager();
})

declare module 'discord.js' {
    interface Client {
        modulesManager: ModulesManager;
    }
}