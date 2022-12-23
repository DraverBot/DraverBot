import { AmethystCommand, preconditions } from "amethystjs";
import moduleEnabled from "../preconditions/moduleEnabled";
import modPermsCheck from "../preconditions/modPermsCheck";
import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { util } from "../utils/functions";
import validProof from "../preconditions/validProof";
import { addModLog, addProof, basicEmbed, codeBox, confirm, modFields } from "../utils/toolbox";
import { confirmReturn } from "../typings/functions";
import replies from "../data/replies";

export default new AmethystCommand({
    name: 'kick',
    description: "Expulse un membre du serveur",
    preconditions: [preconditions.GuildOnly, moduleEnabled, modPermsCheck, validProof],
    options: [
        {
            name: 'membre',
            description: "Membre à expulser",
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'raison',
            description: "Raison de l'expulsion",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: util('proofName'),
            description: "Preuve de votre agissement",
            required: false,
            type: ApplicationCommandOptionType.Attachment
        }
    ],
    permissions: ['KickMembers'],
    clientPermissions: ['KickMembers']
}).setChatInputRun(async({ interaction, options }) => {
    const member = options.getMember('membre') as GuildMember;
    const reason = options.getString('raison');
    const proof = options.getAttachment(util('proofName'));

    const confirmation = await confirm({
        interaction,
        user: interaction.user,
        embed: addProof(basicEmbed(interaction.user)
            .setTitle("Expulsion")
            .setDescription(`Vous êtes sur le point d'expulser ${member} pour la raison :\n${codeBox(reason)}`), proof)
    }).catch(() => {}) as confirmReturn;

    if (confirmation === 'cancel' || !confirmation?.value) return interaction.editReply({
        embeds: [ replies.cancel() ],
        components: []
    }).catch(() => {});
    await interaction.editReply({
        embeds: [ replies.wait(interaction.user) ],
        components: []
    }).catch(( )=> {});
    await member.send({
        embeds: [ basicEmbed(interaction.user, { defaultColor: true })
            .setTitle("Expulsion")
            .setDescription(`Vous avez été expulsé de ${interaction.guild.name} par ${interaction.user.tag} <t:${Math.floor(Date.now() / 1000)}:R> pour la raison :\n${codeBox(reason)}`)
        ]
    }).catch(() => {});

    await Promise.all([
        member.kick().catch(() => {}),
        addModLog({
            guild: interaction.guild,
            member_id: member.id,
            mod_id: interaction.user.id,
            type: 'Kick',
            reason,
            proof: proof?.url
        })
    ]);
    interaction.editReply({
        embeds: [ addProof(basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Expulsion")
                .setDescription(`${member.user.tag} a été expulsé du serveur`)
                .setFields(modFields({ mod: interaction.user, member: member.user, reason })),
            proof)
        ]
    }).catch(() => {});
})