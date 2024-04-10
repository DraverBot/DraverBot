import { log4js, preconditions } from 'amethystjs';
import { DraverCommand } from '../../structures/DraverCommand';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType } from 'discord.js';
import { basicEmbed } from '../../utils/toolbox';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'émoji',
    description: 'Gère kes émojis',
    module: 'administration',
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    permissions: ['ManageEmojisAndStickers'],
    options: [
        {
            name: 'ajouter',
            description: 'Ajoute un émoji au serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: "Nom de l'émoji",
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 50,
                    required: true
                },
                {
                    name: 'image',
                    description: 'Image que vous voulez ajouter',
                    required: true,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un émoji',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: "Nom de l'émoji à supprimer",
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
                            .setTitle('Image invalide')
                            .setDescription(`Merci de spécifier une image`)
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
                            .setTitle('Émoji déjà existant')
                            .setDescription(`Cet émoji existe déjà`)
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
                            .setTitle('Erreur de création')
                            .setDescription(`L'émoji n'a pas pu être ajouté`)
                    ]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Émoji ajouté')
                        .setDescription(
                            `L'émoji \`${name}\` <${res.animated ? 'a' : ''}:${res.name}:${res.id}> a été ajouté`
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
                            .setTitle('Émoji inexistant')
                            .setDescription(`Cet émoji n'existe pas`)
                    ]
                })
                .catch(log4js.trace);

        const res = await emoji.delete().catch(log4js.trace);
        if (!res)
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Suppression échouée')
                            .setDescription(`L'émoji n'a pas pu être supprimé`)
                    ]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Émoji supprimé')
                        .setDescription(`L'émoji ${res.name} a été supprimé`)
                ]
            })
            .catch(log4js.trace);
    }
});
