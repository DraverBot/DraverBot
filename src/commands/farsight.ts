import { AmethystCommand } from 'amethystjs';
import secret from '../preconditions/secret';
import { util } from '../utils/functions';

export default new AmethystCommand({
    name: 'farsight',
    description: 'Farsight, the leader of the rebels',
    preconditions: [secret]
}).setMessageRun(({ message }) => {
    message.channel.send(`Farsight, the leader of the rebels !\n${util('farsight')}`).catch(() => {});
});
