import { AmethystCommand, preconditions, waitForMessage } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, ButtonBuilder, ChannelType, Message, TextChannel } from 'discord.js';
import {
    basicEmbed,
    buildButton,
    checkCtx,
    evokerColor,
    getMsgUrl,
    hint,
    pingChan,
    pingEmoji,
    row
} from '../utils/toolbox';
import { EmbedPackage } from '../managers/embedPack';
import { EmbedBtnIds } from '../typings/commands';
import replies from '../data/replies';
import { getPerm } from '../utils/functions';

export default new AmethystCommand({
    name: 'embed',
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
    }[] = [
        {
            btn: buildButton({ emoji: '🏷️', id: EmbedBtnIds.Title, style: 'Primary' }),
            description: "Modifie le titre de l'embed",
            value: 'setTitle',
            type: 'string'
        },
        {
            btn: buildButton({ emoji: '📜', id: EmbedBtnIds.Description, style: 'Primary' }),
            description: 'Modifie la description',
            value: 'setDescription',
            type: 'string'
        },
        {
            btn: buildButton({ emoji: '🎨', id: EmbedBtnIds.Color, style: 'Secondary' }),
            value: 'setColor',
            type: 'color',
            description: "Modifie la couleur de l'embed"
        },
        {
            btn: buildButton({ emoji: '📖', id: EmbedBtnIds.AuthorText, style: 'Secondary' }),
            value: 'setAuthorText',
            type: 'string',
            description: "Modifie le texte de l'auteur"
        },
        {
            btn: buildButton({ emoji: '📕', id: EmbedBtnIds.AuthorImage, style: 'Secondary' }),
            description: "Ajouter une image à l'auteur",
            type: 'url',
            value: 'setAuthorImage'
        },
        {
            btn: buildButton({ emoji: '🖼️', id: EmbedBtnIds.Image, style: 'Primary' }),
            value: 'setImage',
            type: 'url',
            description: "Ajouter une image à l'embed"
        },
        {
            btn: buildButton({ emoji: '⚡', id: EmbedBtnIds.Field, style: 'Secondary' }),
            value: 'setField',
            type: 'field',
            description: 'Ajoute un champs de texte'
        },
        {
            btn: buildButton({ emoji: '🗑️', id: EmbedBtnIds.RemoveField, style: 'Secondary' }),
            value: 'removeField',
            type: 'removeField',
            description: 'Supprime un champs de texte'
        },
        {
            btn: buildButton({ emoji: '📘', id: EmbedBtnIds.FooterText, style: 'Primary' }),
            value: 'setFooterName',
            type: 'string',
            description: 'Modifie le pied-de-page'
        },
        {
            btn: buildButton({ emoji: '📙', id: EmbedBtnIds.FooterImage, style: 'Secondary' }),
            value: 'setFooterImage',
            description: 'Ajoute une image au pied-de-page',
            type: 'url'
        },
        {
            btn: buildButton({ emoji: '🧵', id: EmbedBtnIds.URL, style: 'Secondary' }),
            value: 'setURL',
            description: 'Configure le lien du titre',
            type: 'url'
        },
        {
            btn: buildButton({ emoji: '🖋️', id: EmbedBtnIds.Thumbnail, style: 'Primary' }),
            value: 'setThumbnail',
            description: 'Ajoute une vignette',
            type: 'url'
        },
        {
            btn: buildButton({ emoji: '⌚', id: EmbedBtnIds.Timestamp, style: 'Secondary' }),
            value: 'setTimestamp',
            description: "Configure la date de l'embed",
            type: 'boolean'
        }
    ];
    pack.setTitle('Embed');
    pack.setDescription(`Vous pouvez personnaliser cet embed avec les boutons`);

    const embeds = () => {
        return [
            basicEmbed(interaction.user, { defaultColor: true })
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
                getBtn('setField').setDisabled(pack.embed.data.fields?.length === 25),
                getBtn('removeField').setDisabled(pack.embed.data.fields?.length === 0)
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
        time: 600000
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
                    basicEmbed(interaction.user, { defaultColor: true })
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
                                )}.\nVérifiez que j'ai bien la permission \`${getPerm('SendMessages')}\` dans ce salon.`
                            )
                            .setColor(evokerColor(interaction.guild))
                    ]
                });
                interaction
                    .editReply({
                        components: components()
                    })
                    .catch(() => {});
                return;
            }
            ctx.deleteReply(rep).catch(() => {});
            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { defaultColor: true })
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
            
        }
    });
});
