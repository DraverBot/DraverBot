const importNumerize = `const { numerize } = require('../utils/toolbox');`;
export type variableName = 'level' | 'greeting' | 'invitations';

export const variablesData: Record<variableName, { name: string; x: string; y: string }[]> = {
    level: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id' },
        { name: 'nom du salon', x: 'channel.name', y: 'channel.name' },
        { name: 'identifiant du salon', x: 'channel.id', y: 'channel.id' },
        { name: 'mention du salon', x: 'channel.mention', y: '`<#${channel.id}>`' },
        { name: 'nom du salon', x: 'channel.name', y: 'channel.name' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name' },
        { name: "niveau de l'utilisateur", x: 'user.level', y: importNumerize + 'numerize(level.level)' },
        {
            name: 'messages requis pour le niveau suivant',
            x: 'user.required',
            y: importNumerize + 'numerize(level.required)'
        }
    ],
    greeting: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name' },
        { name: 'identifiant du serveur', x: 'guild.id', y: 'member.guild.id' },
        {
            name: 'nombre de membres du serveur',
            x: 'guild.count',
            y: importNumerize + 'numerize(member.guild.memberCount)'
        }
    ],
    invitations: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name' },
        { name: 'identifiant du serveur', x: 'guild.id', y: 'member.guild.id' },
        {
            name: 'nombre de membres du serveur',
            x: 'guild.count',
            y: importNumerize + 'numerize(member.guild.memberCount)'
        },
        { name: "mention de l'inviteur", x: 'inviter.mention', y: '`<@${inviter.username}>`' },
        { name: "nom de l'inviteur", x: 'inviter.name', y: 'inviter.username' },
        { name: "tag de l'inviteur", x: 'inviter.tag', y: 'inviter.tag' },
        { name: "id de l'inviteur", x: 'inviter.id', y: 'inviter.id' },
        { name: "nombre d'invitations de l'inviteur", x: 'inviter.invites', y: 'userData.total' }
    ]
};
export const variablesGroupNames: { name: string; value: keyof typeof variablesData }[] = [
    { name: 'niveaux', value: 'level' },
    { name: 'arrivées', value: 'greeting' },
    { name: 'départs', value: 'greeting' },
    { name: 'invitations', value: 'invitations' }
];
