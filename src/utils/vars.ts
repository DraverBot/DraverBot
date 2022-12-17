import { GuildMember, TextChannel } from 'discord.js';
import { levels } from '../typings/managers';
import { numerize, pingChan, pingUser } from './toolbox';

export const replaceLevelVariables = ({
    msg,
    member,
    level,
    channel
}: {
    msg: string;
    member: GuildMember;
    level: levels<number>;
    channel: TextChannel;
}) => {
    let content = msg;
    [
        { x: 'user.mention', y: pingUser(member) },
        { x: 'user.name', y: member.user.username },
        { x: 'user.tag', y: member.user.discriminator },
        { x: 'user.id', y: member.id },
        { x: 'channel.name', y: channel.name },
        { x: 'channel.id', y: channel.id },
        { x: 'channel.mention', y: pingChan(channel) },
        { x: 'guild.name', y: member.guild.name },
        { x: 'user.level', y: numerize(level.level) },
        { x: 'user.required', y: numerize(level.required) }
    ].forEach(({ x, y }) => {
        content = content.replace(new RegExp(`{${x}}`, 'g'), y.toString());
    });

    return content;
};
