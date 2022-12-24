import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import modPermsCheck from '../preconditions/modPermsCheck';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { WordGenerator } from '../managers/Generator';
import validProof from '../preconditions/validProof';
import { util } from '../utils/functions';
import { addModLog, basicEmbed } from '../utils/toolbox';
import { modActionType } from '../typings/database';

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
            description: 'Pseudo à lui donner (écrivez censure pour le censurer)',
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
    const reason = options.getString('raison');
    const proof = options.getAttachment(util('proofName'));
    const pseudo = options.getString('pseudo');

    let nick = pseudo;
    if (pseudo === 'censure') {
        nick = new WordGenerator({
            letters: true,
            capitals: false,
            numbers: false,
            special: true,
            length: (member?.nickname ?? member.user.username).length
        }).generate();
    }
    if (!nick) nick = member.user.username;

    member.setNickname(nick).catch(() => {});

    interaction
        .reply({
            embeds: [
                basicEmbed(interaction.user, { defaultColor: true })
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
