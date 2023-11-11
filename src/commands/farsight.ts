import { DraverCommand } from '../structures/DraverCommand';
import secret from '../preconditions/secret';
import { util } from '../utils/functions';

export default new DraverCommand({
    name: 'farsight',
    module: 'fun',
    description: 'Farsight, the leader of the rebels',
    preconditions: [secret]
}).setMessageRun(({ message }) => {
    message.channel.send(`Farsight, the leader of the rebels !\n${util('farsight')}`).catch(() => {});
});
