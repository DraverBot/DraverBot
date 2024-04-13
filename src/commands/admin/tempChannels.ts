import { configsManager, tempChannels } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, CategoryChannel, ChannelType, GuildMember, VoiceChannel } from 'discord.js';
import replies from '../../data/replies';
import { basicEmbed, confirm, pingChan, plurial } from '../../utils/toolbox';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.temps'),
    module: 'config',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            ...translator.commandData('commands.admins.temps.options.list'),
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            ...translator.commandData('commands.admins.temps.options.create'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.temps.options.create.options.name'),
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.temps.options.create.options.parent'),
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildCategory]
                },
                {
                    ...translator.commandData('commands.admins.temps.options.create.options.channel'),
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildVoice]
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.temps.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.temps.options.delete.options.channel'),
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildVoice]
                }
            ]
        }
    ],
    permissions: ['Administrator'],
    clientPermissions: ['ManageChannels']
}).setChatInputRun(async ({ interaction, options }) => {
    if (!configsManager.getValue(interaction.guild.id, 'temp_channels'))
        return interaction
            .reply({
                embeds: [replies.configDisabled(interaction.member as GuildMember, 'temp_channels', interaction)],
                ephemeral: true
            })
            .catch(log4js.trace);

    const cmd = options.getSubcommand();
    if (cmd === 'liste') {
        const list = tempChannels.getPanels(interaction.guild.id);
        if (!list.length)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.temps.replies.list.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.temps.replies.list.no.description', interaction))
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.temps.replies.list.info.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.temps.replies.list.info.description', interaction, {
                                count: list.length,
                                name: interaction.guild.name,
                                list: list.map(x => pingChan(x.channel_id)).join(', ')
                            })
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'supprimer') {
        const channel = options.getChannel('salon');
        const panel = tempChannels.getPanels(interaction.guild.id).find((x) => x.channel_id === channel.id);

        if (!panel)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.temps.replies.delete.no.title', interaction))
                            .setDescription(translator.translate('commands.admins.temps.replies.delete.no.description', interaction, {
                                channel: pingChan(channel.id)
                            }))
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle(translator.translate('commands.admins.temps.replies.delete.confirm.title', interaction))
                .setDescription(translator.translate('commands.admins.temps.replies.delete.confirm.description', interaction, {
                    channel: pingChan(channel.id)
                }))
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(log4js.trace);

        tempChannels.deletePanel(panel.id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.temps.replies.delete.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.temps.replies.delete.done.description', interaction, {
                            name: channel.name
                        }))
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd === 'créer') {
        const list = tempChannels.getPanels(interaction.guild.id);

        if (list.length === 3)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.temps.replies.create.limit.title', interaction))
                            .setDescription(
                                translator.translate('commands.admins.temps.replies.create.limit.description', interaction, {
                                    name: interaction.guild.name
                                })
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
                            .setTitle(translator.translate('commands.admins.temps.replies.create.exists.title', interaction))
                            .setDescription(translator.translate('commands.admins.temps.replies.create.exists.description', interaction, {
                                channel: pingChan(channel)
                            }))
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (tempChannels.getInstances(interaction.guild.id).find((x) => x.options.channel_id === channel.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.temps.replies.create.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.temps.replies.create.error.description', interaction))
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        await interaction.deferReply().catch(log4js.trace);
        const creation = await tempChannels
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
                    embeds: [replies.mysqlError(interaction.user, { guild: interaction.guild, lang: interaction })]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.temps.replies.create.done.title', interaction))
                        .setDescription(translator.translate('commands.admins.temps.replies.crate.done.description', interaction, {
                            channel: pingChan(channel)
                        }))
                ]
            })
            .catch(log4js.trace);
    }
});
