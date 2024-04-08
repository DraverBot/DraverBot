import { ButtonHandler } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';
import { codeBox, pingUser } from '../utils/toolbox';
import { translator } from '../translate/translate';

export default new ButtonHandler({
    customId: ButtonIds.DisplayNote,
    permissions: ['ManageGuild']
}).setRun(async ({ button, message }) => {
    const field = message.embeds[0]?.fields[1]?.value;
    const id = field.split('<@')[1].split('>')[0];

    await button
        .deferReply({
            ephemeral: true
        })
        .catch(() => {});
    const notes = await query<{ note: string }>(
        `SELECT note FROM ${DatabaseTables.Notes} WHERE guild_id='${button.guild.id}' AND member_id='${id}'`
    );

    if (notes.length === 0)
        return button
            .editReply({
                content: translator.translate('extern.buttons.logs.notes.noNotes', button, { user: pingUser(id) })
            })
            .catch(() => {});

    button.editReply(codeBox(notes[0].note)).catch(() => {});
});
