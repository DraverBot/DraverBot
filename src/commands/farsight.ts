import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand } from 'amethystjs';
import secret from '../preconditions/secret';
import { util } from '../utils/functions';

export default new DraverCommand({
    name: 'farsight',
    module: 'undefined',
    description: 'Farsight, the leader of the rebels',
    preconditions: [secret]
}).setMessageRun(({ message }) => {
    message.channel.send(`Farsight, the leader of the rebels !\n${util('farsight')}`).catch(() => {});
});
