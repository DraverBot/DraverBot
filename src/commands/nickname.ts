import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import modPermsCheck from '../preconditions/modPermsCheck';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import validProof from '../preconditions/validProof';
import { reportToBender, util } from '../utils/functions';
import { addModLog, basicEmbed } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'pseudo',
    description: "Change le pseudo d'un membre",
    options: [
        {
            name: 'membre',
            description: 'Membre à renommer',
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'raison',
            description: 'Raison du changement de pseudo',
            required: false,
            type: ApplicationCommandOptionType.String
        },
        {
            name: 'pseudo',
            description: 'Pseudo à lui donner',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: util('proofName'),
            description: 'Preuve du changement de pseudo',
            required: false,
            type: ApplicationCommandOptionType.Attachment
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    permissions: ['ManageNicknames']
}).setChatInputRun(async ({ interaction, options }) => {
    const member = options.getMember('membre') as GuildMember;
    const reason = options.getString('raison') ?? 'Pas de raison';
    const proof = options.getAttachment(util('proofName'));
    const pseudo = options.getString('pseudo');

    let nick = pseudo;
    if (!nick) nick = member.user.username;
    const old = member?.nickname ?? member.user.username;

    reportToBender({
        type: 'Rename',
        guild: interaction.guild.id,
        user: interaction.user.id,
        data: {
            oldName: old,
            member: member.id
        }
    });

    member.setNickname(nick).catch(() => {});

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Pseudo changé')
                    .setDescription(`Le pseudo de ${member} a été changé`)
            ]
        })
        .catch(() => {});

    addModLog({
        guild: interaction.guild,
        member_id: member.id,
        mod_id: interaction.user.id,
        type: 'Rename',
        reason,
        proof: proof?.url
    }).catch(() => {});
});
