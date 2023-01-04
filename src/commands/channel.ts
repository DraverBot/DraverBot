import { AmethystCommand, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, BaseChannel, CategoryChannel, ChannelType, GuildChannel } from 'discord.js';
import { addModLog, basicEmbed, codeBox, confirm, evokerColor, hint, pingChan, subcmd } from '../utils/toolbox';
import { channelTypeName, util } from '../utils/functions';
import { ChannelCreateChannelTypeOptions } from '../typings/commands';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export default new AmethystCommand({
    name: 'salon',
    description: 'Gère un salon',
    permissions: ['ManageChannels'],
    clientPermissions: ['ManageChannels'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'créer',
            description: 'Créer un salon dans le serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: 'Nom du salon',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'type',
                    description: 'Type du salon',
                    required: true,
                    type: ApplicationCommandOptionType.Integer,
                    choices: ChannelCreateChannelTypeOptions
                },
                {
                    name: 'catégorie',
                    description: 'Catégorie du salon',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildCategory]
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un salon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.Channel
                }
            ]
        },
        {
            name: 'renommer',
            description: 'Renomme un salon',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon à renommer',
                    type: ApplicationCommandOptionType.Channel,
                    required: true
                },
                {
                    name: 'nom',
                    description: 'Nouveau nom du salon',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const name = options.getString('nom');
        const type = options.getInteger('type');
        const parent = options.getChannel('catégorie') as undefined | CategoryChannel;

        if (
            [ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildStageVoice].includes(type) &&
            !interaction.guild.features.includes('COMMUNITY')
        )
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Communautée désactivée')
                            .setDescription(
                                `Vous ne pouvez pas créer de salon **${channelTypeName(
                                    ChannelType[type] as keyof typeof ChannelType
                                )}** sans activer la communautée`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        if (type === ChannelType.GuildCategory && parent)
            return interaction.reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Salon invalide')
                        .setDescription(
                            `Vous ne pouvez pas créer une catégorie dans une catégorie.\nEssayez cette commande à la place :\n${codeBox(
                                `/salon créer nom: ${name} type: ${
                                    ChannelCreateChannelTypeOptions.find((x) => x.value === type).name
                                }`
                            )}`
                        )
                        .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            });
        await interaction.deferReply().catch(() => {});
        const channel = (await interaction.guild.channels
            .create({
                name: name.replace(/ +/g, '-'),
                type,
                parent: parent ?? null
            })
            .catch(() => {})) as BaseChannel;
        if (!channel)
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de création')
                            .setDescription(
                                `Le salon n'a pas pu être crée.\n${hint(
                                    `Ce peut être du au nom du salon ou au réglage de mes permissions\nSi l'erreur persiste, contactez mon [serveur de support](${util(
                                        'support'
                                    )}`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: '',
            reason: `Création de ${pingChan(channel)} ( ${name} \`${channel.id}\` )`,
            type: 'ChannelCreate'
        });
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon crée')
                        .setDescription(`Le salon a été crée dans ${pingChan(channel)}`)
                ]
            })
            .catch(console.log);
        if (channel.isTextBased())
            channel
                .send({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Salon crée')
                            .setDescription(`Salon crée par ${interaction.user}`)
                    ]
                })
                .catch(() => {});
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon', true) as BaseChannel;

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression de salon')
                .setDescription(`Êtes-vous sûr de supprimer le salon ${pingChan(channel)} ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        await interaction
            .editReply({
                components: [],
                embeds: [replies.wait(interaction.user)]
            })
            .catch(() => {});
        const res = await channel.delete().catch(() => {});
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Salon non-supprimé')
                            .setDescription(
                                `Le salon ${pingChan(channel)} n'a pas pu être supprimé.\n${hint(
                                    `Réessayez en vérifiant mes permissions dans ce salon.\nSi l'erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});
        addModLog({
            guild: interaction.guild,
            member_id: '',
            mod_id: interaction.user.id,
            type: 'ChannelDelete',
            reason: `Suppression du salon ${(channel as { name?: string })?.name ?? '*nom inconnu*'} ( \`${
                channel.id
            }\` )`
        }).catch(() => {});
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(`Salon supprimé`)
                        .setDescription(
                            `Le salon ${(channel as { name?: string })?.name ?? '*salon inconnu*'} a été supprimé`
                        )
                ]
            })
            .catch(() => {});
    }
    if (cmd === 'renommer') {
        const channel = options.getChannel('salon') as GuildChannel;
        const name = options.getString('nom');

        await interaction.deferReply().catch(() => {});
        const res = await channel.setName(name.replace(/ +/g, '-')).catch(() => {});

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Erreur de renommage')
                            .setDescription(
                                `Le salon ${pingChan(
                                    channel
                                )} n'a pas pu être renommé.\nLa cause la plus fréquente est le manque de permission.\n${hint(
                                    `Vérifiez mes permissions dans ce salon et réessayez\nSi l'erreur persiste, contactez [mon serveur de support](${util(
                                        'support'
                                    )})`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        await addModLog({
            guild: interaction.guild,
            mod_id: interaction.user.id,
            member_id: '',
            type: 'ChannelEdit',
            reason: `Renommage du salon ${channel.name} ( \`${channel.id}\` )`
        }).catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Renommage de salon')
                        .setDescription(`Le salon ${pingChan(channel)} a été renommé`)
                ]
            })
            .catch(() => {});
    }
});
