import { DraverCommand } from '../structures/DraverCommand';
import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, CategoryChannel, ChannelType, GuildMember, VoiceChannel } from 'discord.js';
import replies from '../data/replies';
import { basicEmbed, confirm, pingChan, plurial } from '../utils/toolbox';

export default new DraverCommand({
    name: 'salons-temporaires',
    module: 'config',
    description: 'Gère les salons temporaires',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'liste',
            description: 'Affiche la liste des salons temporaires',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'créer',
            description: 'Créer un salon temporaire',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: "Nom des salons temporaires. Utilisez {user} pour afficher le nom d'utilisateur",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'catégorie',
                    description: 'Catégorie dans laquelle les salons seront crées',
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildCategory]
                },
                {
                    name: 'salon',
                    description: 'Salon auquel les membres doivent se connecter pour créer un salon',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildVoice]
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un salon temporaire',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: 'Salon temporaire',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildVoice]
                }
            ]
        }
    ],
    permissions: ['Administrator'],
    clientPermissions: ['ManageChannels']
}).setChatInputRun(async ({ interaction, client, options }) => {
    if (!client.configsManager.getValue(interaction.guild.id, 'temp_channels'))
        return interaction
            .reply({
                embeds: [replies.configDisabled(interaction.member as GuildMember, 'temp_channels')],
                ephemeral: true
            })
            .catch(log4js.trace);

    const cmd = options.getSubcommand();
    if (cmd === 'liste') {
        const list = client.tempChannels.getPanels(interaction.guild.id);
        if (!list.length)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de salons')
                            .setDescription(`Aucun salon temporaire n'est configuré`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salons temporaires')
                        .setDescription(
                            `${list.length} salon${plurial(list)} temporaire${plurial(list)} ${plurial(list, {
                                singular: 'est',
                                plurial: 'sont'
                            })} configuré${plurial(list)} sur **${interaction.guild.name}**\n\n${list
                                .map((x) => pingChan(x.channel_id))
                                .join(', ')}`
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon');
        const panel = client.tempChannels.getPanels(interaction.guild.id).find((x) => x.channel_id === channel.id);

        if (!panel)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Pas de salon')
                            .setDescription(`Aucun salon temporaire n'est configuré sur ${pingChan(channel.id)}`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression')
                .setDescription(`Êtes-vous sûr de supprimer le salon temporaire ${pingChan(channel.id)} ?`)
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);

        client.tempChannels.deletePanel(panel.id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon supprimé')
                        .setDescription(`Le salon temporaire de **${channel.name}** a été supprimé`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd === 'créer') {
        const list = client.tempChannels.getPanels(interaction.guild.id);

        if (list.length === 3)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Limite atteinte')
                            .setDescription(
                                `Vous ne pouvez configurer que 3 salons temporaires sur **${interaction.guild.name}**`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const channel = options.getChannel('salon') as VoiceChannel;
        const parent = options.getChannel('catégorie') as CategoryChannel;
        const name = options.getString('nom');

        if (list.find((x) => x.channel_id === channel.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Salon déjà configuré')
                            .setDescription(`Un salon temporaire existe déjà sur ${pingChan(channel)}`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (client.tempChannels.getInstances(interaction.guild.id).find((x) => x.options.channel_id === channel.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Création impossible')
                            .setDescription(`Vous ne pouvez pas créer de salon temporaire sur ce salon`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        await interaction.deferReply().catch(log4js.trace);
        const creation = await client.tempChannels
            .createPanel({
                guild: interaction.guild,
                name,
                parent: parent.id,
                channel: channel.id
            })
            .catch(log4js.trace);

        if (!creation || creation === 'nothing')
            return interaction
                .editReply({
                    embeds: [replies.mysqlError(interaction.user, { guild: interaction.guild })]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon crée')
                        .setDescription(`Un salon temporaire a été crée dans ${pingChan(channel)}`)
                ]
            })
            .catch(log4js.trace);
    }
});
