import { AmethystCommand, preconditions, waitForInteraction } from "amethystjs";
import { ApplicationCommandOptionType, ChannelType, ComponentType, EmbedBuilder, GuildMember, Message, ModalBuilder, ModalSubmitInteraction, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { frequenceBtn, yesNoRow } from "../data/buttons";
import replies from "../data/replies";
import { WordGenerator } from "../managers/Generator";
import moduleEnabled from "../preconditions/moduleEnabled";
import { basicEmbed, pingChan, random, row, subcmd } from "../utils/toolbox";

export default new AmethystCommand({
    name: 'interserver',
    description: "Gère le système d'interserveur sur le serveur",
    options: [
        {
            name: 'créer',
            description: "Créer un salon d'interserveur sur le serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'salon',
                    description: "Salon à configurer",
                    required: true,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        }
    ],
    preconditions: [ preconditions.GuildOnly, moduleEnabled ],
    permissions: ['Administrator']
}).setChatInputRun(async({ interaction, options }) => {
    const subcommand = subcmd(options);

    if (subcommand === 'créer') {
        const channel = options.getChannel('salon') as TextChannel;
    
        const msg = await interaction.reply({
            components: [ yesNoRow() ],
            embeds: [basicEmbed(interaction.user)
                .setTitle("Fréquence optionnelle")
                .setDescription(`Voulez-vous ajouter une fréquence à votre salon d'interchat ?\nSi vous ne voulez pas, une fréquence sera générée aléatoirement`)
                .setColor('Grey')
            ],
            fetchReply: true
        }).catch(() => {}) as Message<true>;

        const reply = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: msg
        }).catch(() => {});

        if (!reply) return interaction.editReply({
            components: [],
            embeds: [ replies.cancel() ]
        });

        let frequence = undefined;
        if (reply.customId === 'yes') {
            const modal = new ModalBuilder()
                .setCustomId('frequencemodal')
                .setTitle('Fréquence')
                .setComponents(row<TextInputBuilder>(
                    new TextInputBuilder()
                        .setCustomId('frequence-field')
                        .setLabel('Fréquence souhaitée')
                        .setMaxLength(255)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder(new WordGenerator({ capitals: true, letters: true, numbers: true, special: true, length: random({ max: 20, min: 16 }) }).generate())
                ))
            await reply.showModal(modal);
            const modalResult = await reply.awaitModalSubmit({
                time: 120000
            }).catch(() => {}) as ModalSubmitInteraction;

            if (!modalResult) interaction.editReply({
                components: [],
                embeds: [replies.cancel()]
            });

            frequence = modalResult.fields.getTextInputValue('frequence-field');
            modalResult.deferUpdate();
        }

        interaction.editReply({
            components: [],
            embeds: [ replies.wait(interaction.user) ]
        }).catch(() => {});
        const res = await interaction.client.interserver.createInterserver({
            channel: channel,
            frequence,
            guild_id: interaction.guild.id
        });
    
        if (typeof res === 'string') {
            const rep = (replies[res] as (user: GuildMember, metadata: any) => EmbedBuilder)(interaction.member as GuildMember, { frequence, channel_id: channel.id, channel })
            return interaction.editReply({
                embeds: [ rep ]
            }).catch(() => {});
        }
    
        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle("Interchat crée")
                .setDescription(`Un salon d'interchat à bien été crée dans le salon ${pingChan(channel)}`)
            ],
            components: [ row(frequenceBtn()) ]
        })
    }
})