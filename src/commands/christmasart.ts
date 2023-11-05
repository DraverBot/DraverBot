import { AmethystCommand, log4js } from 'amethystjs';
import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import dev from '../preconditions/dev';
import { gallery } from '../cache/christmas';
import { basicEmbed } from '../utils/toolbox';
import replies from '../data/replies';

export default new AmethystCommand({
    name: 'galerie',
    description: "Consultez la gallerie d'art de noël",
    options: [
        {
            name: 'consulter',
            description: 'Affiche une image de la galerie',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'poster',
            description: 'Poste une image dans la galerie',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: "Nom de l'image",
                    type: ApplicationCommandOptionType.String,
                    maxLength: 50,
                    required: true
                },
                {
                    name: 'image',
                    description: 'Image que vous voulez poster',
                    type: ApplicationCommandOptionType.Attachment,
                    required: true
                }
            ]
        }
    ],
    preconditions: [dev]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'consulter') {
        const img = gallery.random;
        if (!img)
            return interaction
                .reply({
                    content: "Désolé, il n'y a aucune image dans la galerie pour le moment",
                    ephemeral: true
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(img.name)
                        .setImage(img.url)
                        .setTimestamp(img.when)
                        .setFooter({ text: img.user, iconURL: img.url })
                ]
            })
            .catch((err) => {
                interaction
                    .reply({
                        embeds: [replies.internalError((interaction.member as GuildMember) ?? interaction.user)],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
                log4js.trace(err);
            });
    }
    if (cmd === 'poster') {
        const name = options.getString('nom');
        const img = options.getAttachment('image');

        if (!img.contentType.includes('image'))
            return interaction
                .reply({
                    content: ':x: | Veuillez spécifier une **image**, de type `jpg` ou `png`',
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (gallery.get(img.url))
            return interaction
                .reply({
                    content: `:x: | Cette image a déjà été postée`,
                    ephemeral: true
                })
                .catch(log4js.trace);

        gallery.add({
            user: interaction.user.username,
            url: img.url,
            when: Date.now(),
            name
        });

        interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Image postée')
                        .setDescription(`Votre image a été postée dans la galerie d'arts`)
                ]
            })
            .catch(log4js.trace);
    }
});
