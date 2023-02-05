import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { basicEmbed, evokerColor, row } from '../utils/toolbox';

export default new ButtonHandler({
    customId: ButtonIds.UnGBanUser,
    preconditions: [dev]
}).setRun(async ({ button, user }) => {
    await button
        .showModal(
            new ModalBuilder()
                .setCustomId('removeGBanUser')
                .setTitle('Retrait de GBan')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder({
                            customId: 'gban.id',
                            style: TextInputStyle.Short,
                            required: true,
                            label: 'Identifiant'
                        })
                    )
                )
        )
        .catch(() => {});
    const modal = await button
        .awaitModalSubmit({
            time: 120000
        })
        .catch(() => {});

    if (!modal) return;
    const id = modal.fields.getTextInputValue('gban.id');

    if (!user.client.GBan.isGbanned(id))
        return modal
            .reply({
                embeds: [
                    basicEmbed(user)
                        .setTitle('Utilisateur non GBanni')
                        .setDescription(`L'utilisateur \`${id}\` n'est **pas GBanni**`)
                        .setColor(evokerColor(button.guild))
                ],
                ephemeral: true
            })
            .catch(() => {});
    user.client.GBan.remove(id);
    modal
        .reply({
            embeds: [
                basicEmbed(user, { draverColor: true })
                    .setTitle('Utilisateur UnGBan')
                    .setDescription(`\`${id}\` a été unGBanni`)
            ],
            ephemeral: true
        })
        .catch(() => {});
});
