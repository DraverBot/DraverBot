import { Guild, GuildMember, TextChannel } from 'discord.js';
import { levels } from '../typings/managers';
import { numerize, pingChan, pingUser } from './toolbox';
import { variablesData } from '../data/vars';

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
    variablesData.level.forEach(({ x, y }) => {
        content = content.replace(new RegExp(`{${x}}`, 'g'), eval(y));
    });

    return content;
};
export const replaceFluxVariables = ({ member, guild, msg }: { member: GuildMember; guild: Guild; msg: string }) => {
    let content = msg;
    variablesData.greeting.forEach(({ x, y }) => {
        content = content.replace(new RegExp(`{${x}}`, 'g'), eval(y));
    });

    return content;
};
