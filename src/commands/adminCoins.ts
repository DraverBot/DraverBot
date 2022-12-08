import { AmethystCommand, preconditions } from "amethystjs";
import moduleEnabled from "../preconditions/moduleEnabled";
import { util } from "../utils/functions";

export default new AmethystCommand({
    name: 'admincoins',
    description: `Gère les ${util('coins')} sur le serveur`,
    preconditions: [ preconditions.GuildOnly, moduleEnabled ]
})
.setChatInputRun(async({ interaction, options }) => {
    const subcommand = options.getSubcommand();
})