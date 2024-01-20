import { blagues } from '../cache/managers';
import { ButtonHandler, log4js } from 'amethystjs';
import { ButtonIds } from '../typings/buttons';
import { JokeResponse } from 'blagues-api/dist/types/types';
import { basicEmbed, systemReply } from '../utils/toolbox';
import replies from '../data/replies';
import { GuildMember } from 'discord.js';

export default new ButtonHandler({
    customId: ButtonIds.SendRandomJoke
}).setRun(async ({ button, user }) => {
    const res = await Promise.all([
        button.deferReply({ ephemeral: true }).catch(log4js.trace),
        blagues.randomCategorized('global').catch(log4js.trace)
    ]);
    const joke = res[1] as JokeResponse;

    if (!joke || (joke as unknown as { status: number }).status === 404)
        return systemReply(button, {
            embeds: [replies.internalError((button.member as GuildMember) ?? user)],
            ephemeral: true
        }).catch(log4js.trace);

    button
        .editReply({
            embeds: [basicEmbed(user, { draverColor: true }).setTitle(joke.joke).setDescription(`||${joke.answer}||`)]
        })
        .catch(log4js.trace);
});
