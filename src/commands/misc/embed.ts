import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions, waitForInteraction, waitForMessage } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ButtonBuilder,
    ChannelType,
    ColorResolvable,
    ComponentType,
    GuildMember,
    Message,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextChannel,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { cancelButton, noBtn, yesBtn } from '../../data/buttons';
import replies from '../../data/replies';
import { EmbedPackage } from '../../structures/embedPack';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { EmbedBtnIds } from '../../typings/commands';
import { getRolePerm } from '../../utils/functions';
import {
    anyHexColor,
    basicEmbed,
    buildButton,
    checkCtx,
    confirm,
    evokerColor,
    getMsgUrl,
    hint,
    isValidHexColor,
    pingChan,
    pingEmoji,
    random,
    resizeString,
    row,
    validURL,
    waitForReplies
} from '../../utils/toolbox';

export default new DraverCommand({
    name: 'embed',
    module: 'utils',
    description: 'Fabrique un embed',
    permissions: ['ManageMessages'],
    clientPermissions: ['ManageMessages'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'draver',
            description: 'Met la couleur Draver par défaut',
            required: false,
            type: ApplicationCommandOptionType.Boolean
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const pack = new EmbedPackage({
        defaultColor: options.getBoolean('draver') === true
    });

    const btns: {
        btn: ButtonBuilder;
        description: string;
        value: keyof typeof pack;
        type: 'url' | 'string' | 'boolean' | 'color' | 'field' | 'removeField';
        call: string;
        maxValues?: number;
    }[] = [
        {
            btn: buildButton({ emoji: '🏷️', id: EmbedBtnIds.Title, style: 'Primary' }),
            description: "Modifie le titre de l'embed",
            value: 'setTitle',
            type: 'string',
            call: 'le titre',
            maxValues: 256
        },
        {
            btn: buildButton({ emoji: '📜', id: EmbedBtnIds.Description, style: 'Primary' }),
            description: 'Modifie la description',
            value: 'setDescription',
            type: 'string',
            call: 'la description',
            maxValues: 4000
        },
        {
            btn: buildButton({ emoji: '🎨', id: EmbedBtnIds.Color, style: 'Secondary' }),
            value: 'setColor',
            type: 'color',
            description: "Modifie la couleur de l'embed",
            call: 'la couleur'
        },
        {
            btn: buildButton({ emoji: '📖', id: EmbedBtnIds.AuthorText, style: 'Secondary' }),
            value: 'setAuthorText',
            type: 'string',
            description: "Modifie le texte de l'auteur",
            call: "le texte de l'auteur",
            maxValues: 256
        },
        {
            btn: buildButton({ emoji: '📕', id: EmbedBtnIds.AuthorImage, style: 'Secondary' }),
            description: "Ajouter une image à l'auteur",
            type: 'url',
            value: 'setAuthorImage',
            call: "l'image de l'auteur"
        },
        {
            btn: buildButton({ emoji: '🖼️', id: EmbedBtnIds.Image, style: 'Primary' }),
            value: 'setImage',
            type: 'url',
            description: "Ajouter une image à l'embed",
            call: "l'image de l'embed"
        },
        {
            btn: buildButton({ emoji: '⚡', id: EmbedBtnIds.Field, style: 'Secondary' }),
            value: 'setField',
            type: 'field',
            description: 'Ajoute un champs de texte',
            call: 'le champs de texte'
        },
        {
            btn: buildButton({ emoji: '🗑️', id: EmbedBtnIds.RemoveField, style: 'Secondary' }),
            value: 'removeField',
            type: 'removeField',
            description: 'Supprime un champs de texte',
            call: 'le champs de texte'
        },
        {
            btn: buildButton({ emoji: '📘', id: EmbedBtnIds.FooterText, style: 'Primary' }),
            value: 'setFooterName',
            type: 'string',
            description: 'Modifie le pied-de-page',
            call: 'le pied-de-page',
            maxValues: 2048
        },
        {
            btn: buildButton({ emoji: '📙', id: EmbedBtnIds.FooterImage, style: 'Secondary' }),
            value: 'setFooterImage',
            description: 'Ajoute une image au pied-de-page',
            type: 'url',
            call: "l'image du pied-de-page"
        },
        {
            btn: buildButton({ emoji: '🧵', id: EmbedBtnIds.URL, style: 'Secondary' }),
            value: 'setURL',
            description: 'Configure le lien du titre',
            type: 'url',
            call: 'le lien du titre'
        },
        {
            btn: buildButton({ emoji: '🖋️', id: EmbedBtnIds.Thumbnail, style: 'Primary' }),
            value: 'setThumbnail',
            description: 'Ajoute une vignette',
            type: 'url',
            call: "la vignette de l'embed"
        },
        {
            btn: buildButton({ emoji: '⌚', id: EmbedBtnIds.Timestamp, style: 'Secondary' }),
            value: 'setTimestamp',
            description: "Configure la date de l'embed",
            type: 'boolean',
            call: "la date de l'embed"
        }
    ];
    pack.setTitle('Embed');
    pack.setDescription(`Vous pouvez personnaliser cet embed avec les boutons`);

    const embeds = () => {
        return [
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Construction')
                .setDescription(
                    `Appuyez sur les boutons pour construire l'embed que vous voulez.\n${btns
                        .map((x) => `${pingEmoji(x.btn.data.emoji)} ${x.description}`)
                        .join('\n')}\nVous pouvez le construire pendant dix minutes.\n${hint(
                        `Vous pouvez à tout moment appuyer sur le bouton "annuler" ou taper \`cancel\` dans le chat pour annuler la commande ou la configuration d'une caractéristique de l'embed`
                    )}`
                ),
            pack.embed
        ];
    };
    const components = (disableAll?: boolean) => {
        const getBtn = (name: keyof typeof pack) => {
            const btnData = btns.find((x) => x.value === name).btn;
            const btn = new ButtonBuilder(btnData.data);
            return btn;
        };
        const cpmts = [
            row(
                getBtn('setTitle'),
                getBtn('setDescription'),
                getBtn('setAuthorText'),
                getBtn('setAuthorImage'),
                getBtn('setColor')
            ),
            row(
                getBtn('setImage'),
                getBtn('setThumbnail'),
                getBtn('setTimestamp'),
                getBtn('setField').setDisabled((pack.embed.data.fields?.length ?? 0) === 25),
                getBtn('removeField').setDisabled((pack.embed.data.fields?.length ?? 0) === 0)
            ),
            row(
                getBtn('setFooterName'),
                getBtn('setFooterImage'),
                getBtn('setURL'),
                buildButton({
                    label: 'Envoyer',
                    id: EmbedBtnIds.Send,
                    style: 'Success'
                }),
                buildButton({
                    label: 'Annuler',
                    id: 'cancel',
                    style: 'Danger'
                })
            )
        ];
        if (disableAll === true) {
            cpmts.forEach((cmpt) => {
                cmpt.components.forEach((btn) => {
                    btn.setDisabled(true);
                });
            });
        }

        return cpmts;
    };
    const msg = (await interaction
        .reply({
            embeds: embeds(),
            fetchReply: true,
            components: components()
        })
        .catch(() => {})) as Message<true>;
    const collector = msg.createMessageComponentCollector({
        time: 600000,
        componentType: ComponentType.Button
    });

    collector.on('collect', async (ctx) => {
        if (!checkCtx(ctx, interaction.user)) return;
        if (ctx.customId === 'cancel') {
            interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

            return collector.stop('cancel');
        }
        if (ctx.customId === EmbedBtnIds.Send) {
            interaction
                .editReply({
                    components: components(true)
                })
                .catch(() => {});
            const rep = (await ctx.reply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Salon')
                        .setDescription(
                            `Dans quel salon voulez-vous envoyer l'embed ?\nRépondez dans le chat par un nom, un identifiant ou une mention\n${hint(
                                `Vous avez **2 minutes**\nRépondez par \`cancel\` pour annuler`
                            )}`
                        )
                ],
                fetchReply: true,
                ephemeral: true
            })) as Message<true>;

            const reply = await waitForMessage({
                channel: interaction.channel as TextChannel,
                user: interaction.user,
                time: 120000
            });
            if (reply && reply.deletable) reply.delete().catch(() => {});
            if (!reply || reply.content === 'cancel') {
                ctx.editReply({
                    embeds: [replies.cancel()]
                }).catch(() => {});
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const channel =
                reply.mentions.channels.first() ??
                interaction.guild.channels.cache.get(reply.content) ??
                interaction.guild.channels.cache.find((x) => x.name === reply.content);

            if (!channel || channel.type !== ChannelType.GuildText) {
                ctx.editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de salon')
                            .setDescription(
                                `Le salon est introuvable.\nRéessayez avec un nom, un identifiant ou une mention\n${hint(
                                    `Vérifiez que le salon est bien un salon textuel`
                                )}`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                }).catch(() => {});
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const result = await channel
                .send({
                    embeds: [pack.embed]
                })
                .catch(() => {});
            if (!result) {
                ctx.editReply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle("Erreur d'envoi")
                            .setDescription(
                                `L'embed n'a pas pu être envoyé dans ${pingChan(
                                    channel
                                )}.\nVérifiez que j'ai bien la permission \`${getRolePerm(
                                    'SendMessages'
                                )}\` dans ce salon.`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                });
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                collector.stop('ended');
                return;
            }
            ctx.deleteReply(rep).catch(() => {});
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setDescription(`L'embed a bien été envoyé dans le salon ${pingChan(channel)}`)
                            .setURL(
                                getMsgUrl({
                                    guild_id: interaction.guild.id,
                                    channel_id: channel.id,
                                    message_id: result.id
                                })
                            )
                            .setTitle('Embed envoyé')
                    ],
                    components: []
                })
                .catch(() => {});
            return;
        }
        const data = btns.find((x) => (x.btn.data as { custom_id: string }).custom_id === ctx.customId);
        if (data.type === 'boolean') {
            interaction
                .editReply({
                    components: components(true)
                })
                .catch(() => {});
            const ask = (await ctx
                .reply({
                    fetchReply: true,
                    ephemeral: true,
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Configuration')
                            .setDescription(
                                `Voulez vous **activer** ou **désactiver** ${data.call} ?\n${hint(
                                    `Vous avez **deux minutes**`
                                )}`
                            )
                    ],
                    components: [row(yesBtn({ label: 'Activer' }), noBtn({ label: 'Désactiver' }), cancelButton())]
                })
                .catch(() => {})) as Message<true>;
            const rep = await waitForInteraction({
                componentType: ComponentType.Button,
                message: ask,
                user: interaction.user,
                replies: waitForReplies(interaction.client)
            }).catch(() => {});

            if (!rep || rep.customId === 'cancel') {
                ctx.editReply({
                    embeds: [replies.cancel()],
                    components: []
                }).catch(() => {});
                interaction
                    .editReply({
                        embeds: embeds(),
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            (pack[data.value] as CallableFunction)(rep.customId === 'yes');
            ctx.deleteReply(ask).catch(() => {});

            interaction
                .editReply({
                    embeds: embeds(),
                    components: components()
                })
                .catch(() => {});
        }
        if (data.type === 'color') {
            const modal = new ModalBuilder()
                .setTitle('Couleur')
                .setCustomId('couleur')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel('Couleur')
                            .setCustomId('color')
                            .setMaxLength(7)
                            .setMinLength(3)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(anyHexColor({ randomlyAddedHashtag: true, hashtagIncluded: true }))
                    )
                );
            await ctx.showModal(modal).catch(() => {});
            const res = await ctx
                .awaitModalSubmit({
                    time: 120000
                })
                .catch(() => {});
            if (!res) {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const color = res.fields.getTextInputValue('color');
            if (!isValidHexColor(color)) {
                res.reply({
                    embeds: [replies.invalidColor(interaction.member as GuildMember)],
                    ephemeral: true
                }).catch(() => {});
            }
            res.deferUpdate().catch(() => {});
            pack.setColor(color as ColorResolvable);
            interaction
                .editReply({
                    embeds: embeds(),
                    components: components()
                })
                .catch(() => {});
        }
        if (data.type === 'field') {
            const modal = new ModalBuilder()
                .setTitle('Champs de texte')
                .setCustomId('field')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel('Nom du champs')
                            .setCustomId('field.name')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(256)
                    ),
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel('Contenu')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Contenu du champs de texte')
                            .setCustomId('field.value')
                            .setMaxLength(2048)
                            .setRequired(true)
                    ),
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel('En colonne')
                            .setPlaceholder(['oui', 'non'][random({ max: 2, min: 0 })])
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                            .setCustomId('field.inline')
                            .setMaxLength(3)
                            .setMinLength(3)
                    )
                );
            await ctx.showModal(modal).catch(() => {});
            const res = await ctx
                .awaitModalSubmit({
                    time: 120000
                })
                .catch(() => {});
            if (!res) {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const name = res.fields.getTextInputValue('field.name');
            const value = res.fields.getTextInputValue('field.value');
            const inline = res.fields.getTextInputValue('field.inline') === 'oui';

            res.deferUpdate().catch(() => {});
            pack.setField({
                name,
                value,
                inline
            });
            interaction
                .editReply({
                    components: components(),
                    embeds: embeds()
                })
                .catch(() => {});
            return;
        }
        if (data.type === 'removeField') {
            interaction
                .editReply({
                    components: components(true)
                })
                .catch(() => {});
            const selector = new StringSelectMenuBuilder()
                .setMaxValues(1)
                .setOptions(
                    pack.embed.data.fields.map((x) => ({
                        label: resizeString({ str: x.name, length: 50 }),
                        value: pack.embed.data.fields.indexOf(x).toString(),
                        description: resizeString({ str: x.value, length: 100 })
                    }))
                )
                .setCustomId('field-selector');
            const question = (await ctx
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Suppression de champs')
                            .setDescription(`Choisissez le champs que vous voulez supprimer`)
                    ],
                    components: [
                        row<StringSelectMenuBuilder>(selector),
                        row<StringSelectMenuBuilder>(
                            new StringSelectMenuBuilder({
                                custom_id: 'cancel',
                                options: [
                                    {
                                        label: 'Annuler',
                                        description: 'Annuler la suppression de champs de texte',
                                        value: 'cancel'
                                    }
                                ],
                                maxValues: 1,
                                placeholder: 'Annuler'
                            })
                        )
                    ],
                    fetchReply: true,
                    ephemeral: true
                })
                .catch(() => {})) as Message<true>;
            const select = await waitForInteraction({
                message: question,
                componentType: ComponentType.StringSelect,
                user: interaction.user,
                replies: waitForReplies(interaction.client)
            }).catch(() => {});

            if (!select || select.values[0] === 'cancel') {
                ctx.deleteReply(question).catch(() => {});
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            await select.deferUpdate();
            const field = pack.embed.data.fields[parseInt(select.values[0])];
            const validation = await confirm({
                embed: basicEmbed(interaction.user)
                    .setTitle('Suppression de champs')
                    .setDescription(`Voulez-vous supprimer le champs **${field.name}**`),
                user: interaction.user,
                interaction: ctx
            }).catch(() => {});

            ctx.deleteReply(question).catch(() => {});
            if (!validation || validation === 'cancel' || !validation.value) {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            pack.removeField(parseInt(select.values[0]));

            interaction
                .editReply({
                    components: components(),
                    embeds: embeds()
                })
                .catch(() => {});
        }
        if (data.type === 'string') {
            const modal = new ModalBuilder()
                .setTitle('Valeur textuelle')
                .setCustomId('string')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel(`${data?.call} de l'embed`)
                            .setCustomId('value')
                            .setRequired(true)
                            .setStyle(data.value === 'setDescription' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                            .setMaxLength(data.maxValues ?? 2048)
                    )
                );
            await ctx.showModal(modal).catch(() => {});
            const res = await ctx
                .awaitModalSubmit({
                    time: 120000
                })
                .catch(() => {});
            if (!res) {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const value = res.fields.getTextInputValue('value');

            (pack[data.value] as CallableFunction)(value);
            res.deferUpdate().catch(() => {});
            interaction
                .editReply({
                    components: components(),
                    embeds: embeds()
                })
                .catch(() => {});
            return;
        }
        if (data.type === 'url' && (data.call.toLowerCase().includes('image') || data.value === 'setThumbnail')) {
            interaction
                .editReply({
                    components: components(true)
                })
                .catch(() => {});
            const ask = (await ctx
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, {
                            questionMark: true
                        })
                            .setTitle(`${data.call} de l'embed`)
                            .setDescription(
                                `Quelle est ${
                                    data.call
                                } de l'embed ?\nRépondez par une URL ou un fichier dans le chat.\n${hint(
                                    `Les formats acceptés sont \`jpg\`, \`jpeg\`, \`png\` et \`gif\`\nVous avez deux minutes pour répondre dans le chat\nRépondez par \`vide\` pour supprimer ${data.call}\nRépondez par \`cancel\` pour annuler`
                                )}`
                            )
                    ],
                    fetchReply: true,
                    ephemeral: true
                })
                .catch(() => {})) as Message<true>;
            const reply = (await waitForMessage({
                channel: ctx.channel as TextChannel,
                user: ctx.user
            }).catch(() => {})) as Message<true>;

            if (reply && reply.deletable) reply.delete().catch(() => {});
            if (!reply || reply.content?.toLowerCase() === 'cancel') {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                ctx.editReply({
                    embeds: [replies.cancel()]
                }).catch(() => {});
                return;
            }
            if (reply.content?.toLowerCase() === 'vide') {
                (pack[data.value] as CallableFunction)(null);
                interaction
                    .editReply({
                        embeds: embeds(),
                        components: components()
                    })
                    .catch(() => {});
                ctx.deleteReply(ask).catch(() => {});
                return;
            }

            let url;
            const invalidLinkEmbed = basicEmbed(interaction.user)
                .setTitle('Image invalide')
                .setColor(evokerColor(interaction.guild))
                .setDescription(
                    `Ce n'est pas une image valide.\nRéessayez en répondant par un fichier ou un lien.\nLes formats acceptés sont \`jpg\`, \`jpeg\`, \`png\`, \`svg\`, \`webp\` et \`gif\``
                );
            if (reply.attachments.size > 0) {
                const img = reply.attachments.filter((x) => x.contentType.toLowerCase().includes('image')).first();
                if (!img) {
                    interaction
                        .editReply({
                            components: components()
                        })
                        .catch(() => {});
                    ctx.editReply({
                        embeds: [invalidLinkEmbed]
                    }).catch(() => {});
                    return;
                }
                url = img.url;
            } else {
                if (!validURL(reply.content)) {
                    console.log('first');
                    interaction
                        .editReply({
                            components: components()
                        })
                        .catch(() => {});
                    ctx.editReply({
                        embeds: [invalidLinkEmbed]
                    }).catch(() => {});
                    return;
                }
                if (!/\.(jpg|jpeg|png|webp|gif|svg)$/.test(reply.content)) {
                    console.log('second');
                    interaction
                        .editReply({
                            components: components()
                        })
                        .catch(() => {});
                    ctx.editReply({
                        embeds: [invalidLinkEmbed]
                    }).catch(() => {});
                    return;
                }
                url = reply.content;
            }
            (pack[data.value] as CallableFunction)(url);
            interaction
                .editReply({
                    embeds: embeds(),
                    components: components()
                })
                .catch(() => {});
            ctx.deleteReply(ask).catch(() => {});
        } else if (data.type === 'url') {
            const modal = new ModalBuilder()
                .setTitle('Lien')
                .setCustomId('link')
                .setComponents(
                    row<TextInputBuilder>(
                        new TextInputBuilder()
                            .setLabel(`${data?.call} de l'embed`)
                            .setCustomId('value')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    )
                );
            await ctx.showModal(modal).catch(() => {});
            const res = await ctx
                .awaitModalSubmit({
                    time: 120000
                })
                .catch(() => {});
            if (!res) {
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            const value = res.fields.getTextInputValue('value');

            if (!validURL(value)) {
                res.reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Lien invalide')
                            .setDescription(
                                `Le lien est invalide\nRéessayez avec un lien valide (commençant par \`https\`)`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                }).catch(() => {});
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }

            (pack[data.value] as CallableFunction)(value);
            res.deferUpdate().catch(() => {});
            interaction
                .editReply({
                    components: components(),
                    embeds: embeds()
                })
                .catch(() => {});
            return;
        }
    });
    collector.on('end', (collected, reason) => {
        if (reason !== 'cancel' && reason !== 'ended')
            interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
    });
});
