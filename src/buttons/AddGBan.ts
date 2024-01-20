import { GBan } from '../cache/managers';
import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import dev from '../preconditions/dev';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { basicEmbed, codeBox, evokerColor, row } from '../utils/toolbox';

export default new ButtonHandler({
    customId: ButtonIds.GBanUser,
    preconditions: [dev]
}).setRun(async ({ button, user }) => {
    await button
        .showModal(
            new ModalBuilder()
                .setCustomId('addGBanUser')
                .setTitle('Ajout de GBan')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder({
                            customId: 'gban.id',
                            style: TextInputStyle.Short,
                            required: true,
                            label: 'Identifiant'
                        })
                    ),
                    row<TextInputBuilder>(
                        new TextInputBuilder({
                            customId: 'gban.reason',
                            style: TextInputStyle.Paragraph,
                            required: true,
                            label: 'Raison',
                            maxLength: 255
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
    const reason = modal.fields.getTextInputValue('gban.reason');

    if (GBan.isGbanned(id))
        return modal
            .reply({
                embeds: [
                    basicEmbed(user)
                        .setTitle('Utilisateur déjà GBanni')
                        .setDescription(`L'utilisateur \`${id}\` est **déjà GBanni**`)
                        .setColor(evokerColor(button.guild))
                ],
                ephemeral: true
            })
            .catch(() => {});
    GBan.add({
        reason,
        user: id
    });
    modal
        .reply({
            embeds: [
                basicEmbed(user, { draverColor: true })
                    .setTitle('Utilisateur GBan')
                    .setDescription(`\`${id}\` a été GBanni pour la raison ${codeBox(reason)}`)
            ],
            ephemeral: true
        })
        .catch(() => {});
});
