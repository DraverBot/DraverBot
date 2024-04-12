import { log4js, preconditions } from 'amethystjs';
import { DraverCommand } from '../../structures/DraverCommand';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed } from '../../utils/toolbox';
import replies from '../../data/replies';
import { translator } from '../../translate/translate';

export default new DraverCommand({
    ...translator.commandData('commands.admins.emoji'),
    module: 'administration',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageEmojisAndStickers'],
    options: [
        {
            ...translator.commandData('commands.admins.emoji.options.add'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.emoji.options.add.options.name'),
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 50,
                    required: true
                },
                {
                    ...translator.commandData('commands.admins.emoji.options.add.options.image'),
                    required: true,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            ...translator.commandData('commands.admins.emoji.options.delete'),
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    ...translator.commandData('commands.admins.emoji.options.delete.options.name'),
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'ajouter') {
        const name = options.getString('nom').replace(/ +/g, '_');
        const attachment = options.getAttachment('image');

        if (!attachment.contentType.includes('image'))
            return interaction
                .reply({
                    ephemeral: true,
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.emoji.replies.add.invalidImage.title', interaction))
                            .setDescription(translator.translate('commands.admins.emoji.replies.add.invalidImage.description', interaction))
                    ]
                })
                .catch(log4js.trace);
        await Promise.all([
            interaction
                .reply({
                    embeds: [replies.wait(interaction.user, interaction)]
                })
                .catch(log4js.trace),
            interaction.guild.emojis.fetch().catch(log4js.trace)
        ]).catch(log4js.trace);

        if (interaction.guild.emojis.cache.find((x) => x.name === name))
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.emoji.replies.add.exists.title', interaction))
                            .setDescription(translator.translate('commands.admins.emoji.replies.add.exists.description', interaction))
                    ]
                })
                .catch(log4js.trace);

        const res = await interaction.guild.emojis
            .create({
                name: name,
                attachment: attachment.url
            })
            .catch(log4js.trace);

        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.emoji.replies.add.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.emoji.replies.add.error.description', interaction))
                    ]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.emoji.replies.add.added.title', interaction))
                        .setDescription(
                            translator.translate('commands.admins.emoji.replies.add.added.description', interaction, {
                                name: name,
                                emoji: `<${res.animated ? 'a' : ''}:${res.name}:${res.id}>`
                            })
                        )
                ]
            })
            .catch(log4js.trace);
    }
    if (cmd === 'supprimer') {
        const name = options.getString('nom');

        await Promise.all([
            interaction
                .reply({
                    embeds: [replies.wait(interaction.user, interaction)]
                })
                .catch(log4js.trace),
            interaction.guild.emojis.fetch().catch(log4js.trace)
        ]).catch(log4js.trace);

        const emoji = interaction.guild.emojis.cache.find((x) => x.name === name);
        if (!emoji)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.emoji.replies.delete.unexisting.title', interaction)
                            )
                            .setDescription(translator.translate('commands.admins.emoji.replies.delete.unexisting.description', interaction))
                    ]
                })
                .catch(log4js.trace);

        const res = await emoji.delete().catch(log4js.trace);
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle(translator.translate('commands.admins.emoji.replies.delete.error.title', interaction))
                            .setDescription(translator.translate('commands.admins.emoji.replies.delete.error.description', interaction))
                    ]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(translator.translate('commands.admins.emoji.replies.delete.deleted.title', interaction))
                        .setDescription(translator.translate('commands.admins.emoji.replies.delete.deleted.description', interaction, { name: res.name }))
                ]
            })
            .catch(log4js.trace);
    }
});
