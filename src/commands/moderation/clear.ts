import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, ChannelType, Collection, GuildMember, Message, TextChannel } from 'discord.js';
import validProof from '../../preconditions/validProof';
import { addModLog, basicEmbed, checkPerms, notNull, pingChan, pingUser, plurial } from '../../utils/toolbox';
import replies from '../../data/replies';
import { getRolePerm } from '../../utils/functions';

export default new DraverCommand({
    name: 'clear',
    module: 'moderation',
    description: 'Supprime des messages',
    preconditions: [preconditions.GuildOnly, moduleEnabled, validProof],
    clientPermissions: ['ManageMessages'],
    permissions: ['ManageMessages'],
    options: [
        {
            name: 'nombre',
            description: 'Nombre de messages à supprimer',
            required: true,
            type: ApplicationCommandOptionType.Integer,
            minValue: 1,
            maxValue: 100
        },
        {
            name: 'salon',
            description: 'Salon dans lequel les messages doivent être supprimés',
            type: ApplicationCommandOptionType.Channel,
            required: false,
            channelTypes: [
                ChannelType.GuildText,
                ChannelType.AnnouncementThread,
                ChannelType.GuildAnnouncement,
                ChannelType.GuildForum,
                ChannelType.PublicThread,
                ChannelType.PrivateThread
            ]
        },
        {
            name: 'membre',
            description: "Filtre les messages d'un utilisateur spécifique",
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'raison',
            description: 'Raison du nettoyage',
            required: false,
            type: ApplicationCommandOptionType.String
        },
        {
            name: 'preuve',
            description: 'Preuve de votre acte',
            required: false,
            type: ApplicationCommandOptionType.Attachment
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const amount = options.getInteger('nombre');
    const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;
    const member = options.getMember('membre') as GuildMember | null;
    const reason = options.getString('raison') ?? 'Pas de raison';
    const proof = options.getAttachment('preuve');

    if (
        member &&
        !checkPerms({
            member,
            mod: interaction.member as GuildMember,
            checkBot: false,
            checkClientPosition: true,
            checkOwner: true,
            checkModPosition: true,
            ownerByPass: true,
            interaction,
            sendErrorMessage: true
        })
    )
        return;

    const rep = (await interaction
        .reply({
            embeds: [replies.wait(interaction.user, interaction)],
            fetchReply: true
        })
        .catch(log4js.trace)) as Message<true>;

    await channel.messages.fetch().catch(log4js.trace);

    const messages = channel.messages.cache.filter(
        (x) => (notNull(member) ? x.author.id === member.id : true) && x.id !== rep.id
    );
    const toDelete = new Collection<string, Message>(
        messages
            .toJSON()
            .slice(0, amount)
            .map((x) => [x.id, x])
    );

    const res = await channel.bulkDelete(toDelete).catch(log4js.trace);
    if (!res)
        return interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Erreur de suppression')
                        .setDescription(
                            `Les messages n'ont pas pu être supprimés.\nAssurez-vous que j'ai les permissions de voir le salon ${pingChan(
                                channel
                            )} et que j'ai la permission \`${getRolePerm('ManageMessages')}\``
                        )
                ]
            })
            .catch(log4js.trace);

    await addModLog({
        guild: interaction.guild,
        member_id: member?.id ?? null,
        mod_id: interaction.user.id,
        proof: proof?.url,
        type: 'MessageBulkDelete',
        reason
    }).catch(log4js.trace);

    interaction
        .editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Messages supprimés')
                    .setDescription(
                        `${amount} message${plurial(amount)}${member ? ` de ${pingUser(member)}` : ''} ${plurial(
                            amount,
                            { singular: 'a été supprimé', plurial: 'ont été supprimés' }
                        )}${channel.id !== interaction.channel.id ? ` dans ${pingChan(channel)}` : ''}`
                    )
            ]
        })
        .catch(log4js.trace);
});
