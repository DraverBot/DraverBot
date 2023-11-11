import { log4js, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message, StringSelectMenuBuilder } from 'discord.js';
import dev from '../preconditions/dev';
import { gallery } from '../cache/christmas';
import { basicEmbed, displayDate, row, secondsToWeeks, waitForReplies } from '../utils/toolbox';
import replies from '../data/replies';
import { yesNoRow } from '../data/buttons';
import { DraverCommand } from '../structures/DraverCommand';

export default new DraverCommand({
    name: 'galerie',
    description: "Consultez la gallerie d'art de noël",
    module: 'fun',
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
})
    .setChatInputRun(async ({ interaction, options }) => {
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
    })
    .setMessageRun(async ({ message, options }) => {
        const selection = options.first?.toLowerCase();
        if (!selection)
            return message
                .reply(`:x: | Veuilllez préciser le nom de l'image que vous voulez supprimer`)
                .catch(log4js.trace);
        const selected = gallery.cache.filter(
            (x) => x.name.toLowerCase().includes(selection) || selection.includes(x.name.toLowerCase())
        );

        if (!selected.size) return message.reply(`:x: | Aucune image n'a été trouvée`).catch(log4js.trace);

        let final: string;
        let rep: Message<true>;
        if (selected.size === 0) final === selected.first()?.url;
        else {
            const selector = new StringSelectMenuBuilder().setCustomId('art-gallery.remove').setOptions(
                selected
                    .toJSON()
                    .slice(0, 24)
                    .map((x) => ({
                        label: x.name,
                        description: `Par ${x.user} ${secondsToWeeks(Math.round(x.when / 1000))}`,
                        value: x.url
                    }))
            );

            rep = (await message.channel
                .send({
                    content: "❓ | Veuillez choisir l'image à supprimer",
                    components: [row(selector)]
                })
                .catch(log4js.trace)) as Message<true>;
            if (!rep) return;

            const choice = await waitForInteraction({
                componentType: ComponentType.StringSelect,
                user: message.author,
                message: rep,
                replies: waitForReplies(message.client)
            }).catch(log4js.trace);
            if (!choice)
                return rep
                    .edit({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
            await rep
                .edit({
                    components: []
                })
                .catch(log4js.trace);

            final = choice.values[0];
        }

        const art = gallery.get(final);
        const embed = basicEmbed(message.author, { questionMark: true })
            .setTitle('Suppression')
            .setDescription(
                `Êtes-vous sûr de vouloir supprimer **${art.name}** de ${art.user} ( ${displayDate(art.when)} )`
            )
            .setImage(art.url);

        if (!rep) {
            rep = (await message.channel
                .send({
                    embeds: [embed],
                    components: [yesNoRow()]
                })
                .catch(log4js.trace)) as Message<true>;
            if (!rep) return;
        } else {
            rep.edit({
                embeds: [embed],
                components: [yesNoRow()],
                content: '** **'
            }).catch(log4js.trace);
        }

        const validation = await waitForInteraction({
            componentType: ComponentType.Button,
            message: rep,
            user: message.author,
            replies: waitForReplies(message.client)
        }).catch(log4js.trace);
        if (!validation || validation.customId === 'no')
            return rep
                .edit({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(log4js.trace);

        gallery.remove(art.url);

        rep.edit({
            content: `L'image a été retirée de la galerie`,
            embeds: [],
            components: []
        }).catch(log4js.trace);
    });
