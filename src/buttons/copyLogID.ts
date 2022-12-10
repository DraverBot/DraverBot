import { ButtonHandler } from "amethystjs";

export default new ButtonHandler({
    customId: 'copyLogID'
}).setRun(({ message, button }) => {
    const id = message.embeds[0].fields.find(x => x.name === 'Identifiant').value

    button.reply({
        content: `L'identifiant du log est ${id}`,
        ephemeral: true
    }).catch(() => {});
})