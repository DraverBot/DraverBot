const importNumerize = `const { numerize } = require('../utils/toolbox');`;
export type variableName = 'level' | 'greeting' | 'invitations';

export const variablesData: Record<variableName, { name: string; x: string; y: string; id: string }[]> = {
    level: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`', id: 'user_mention' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username', id: 'user_name' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag', id: 'user_tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id', id: 'user_id' },
        { name: 'identifiant du salon', x: 'channel.id', y: 'channel.id', id: 'channel_id' },
        { name: 'mention du salon', x: 'channel.mention', y: '`<#${channel.id}>`', id: 'channel_mention' },
        { name: 'nom du salon', x: 'channel.name', y: 'channel.name', id: 'channel_name' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name', id: 'guild_name' },
        { name: "niveau de l'utilisateur", x: 'user.level', y: importNumerize + 'numerize(level.level)', id: 'user_level' },
        {
            name: 'messages requis pour le niveau suivant',
            x: 'user.required',
            y: importNumerize + 'numerize(level.required)',
            id: 'user_required'
        }
    ],
    greeting: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`', id: 'user_mention' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username', id: 'user_name' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag', id: 'user_tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id', id: 'user_id' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name', id: 'guild_name' },
        { name: 'identifiant du serveur', x: 'guild.id', y: 'member.guild.id', id: 'guild_id' },
        {
            name: 'nombre de membres du serveur',
            x: 'guild.count',
            y: importNumerize + 'numerize(member.guild.memberCount)',
            id: 'guild_count'
        }
    ],
    invitations: [
        { name: "mention de l'utilisateur", x: 'user.mention', y: '`<@${member.id}>`', id: 'user_mention' },
        { name: "nom de l'utilisateur", x: 'user.name', y: 'member.user.username', id: 'user_name' },
        { name: "tag de l'utilisateur", x: 'user.tag', y: 'member.user.tag', id: 'user_tag' },
        { name: "identifiant du l'utilisateur", x: 'user.id', y: 'member.id', id: 'user_id' },
        { name: 'nom du serveur', x: 'guild.name', y: 'member.guild.name', id: 'guild_name' },
        { name: 'identifiant du serveur', x: 'guild.id', y: 'member.guild.id', id: 'guild_id' },
        {
            name: 'nombre de membres du serveur',
            x: 'guild.count',
            y: importNumerize + 'numerize(member.guild.memberCount)',
            id: 'guild_count'
        },
        { name: "mention de l'inviteur", x: 'inviter.mention', y: '`<@${inviter.username}>`', id: 'inviter_mention' },
        { name: "nom de l'inviteur", x: 'inviter.name', y: 'inviter.username', id: 'inviter_name' },
        { name: "tag de l'inviteur", x: 'inviter.tag', y: 'inviter.tag', id: 'inviter_tag' },
        { name: "id de l'inviteur", x: 'inviter.id', y: 'inviter.id', id: 'inviter_id' },
        { name: "nombre d'invitations de l'inviteur", x: 'inviter.invites', y: 'userData.total', id: 'inviter_invites' }
    ]
};
export const variablesGroupNames: { name: string; value: keyof typeof variablesData; id: string }[] = [
    { name: 'niveaux', value: 'level', id: 'level' },
    { name: 'arrivées', value: 'greeting', id: 'greeting_joins' },
    { name: 'départs', value: 'greeting', id: 'greeting_leaves' },
    { name: 'invitations', value: 'invitations', id: 'invites' }
];
