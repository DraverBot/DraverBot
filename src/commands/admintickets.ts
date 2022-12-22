import { AmethystCommand, preconditions } from "amethystjs";
import moduleEnabled from "../preconditions/moduleEnabled";
import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, GuildMember, TextChannel, User } from "discord.js";
import { basicEmbed, confirm, evokerColor, getMsgUrl, numerize, pagination, pingChan, pingRole, pingUser, plurial, resizeString, subcmd } from "../utils/toolbox";
import replies from "../data/replies";
import { ticketChannels } from "../typings/database";
import { confirmReturn } from "../typings/functions";

export default new AmethystCommand({
    name: 'admintickets',
    description: "Gère les tickets sur le serveur",
    permissions: ['Administrator'],
    preconditions: [preconditions.GuildOnly, moduleEnabled],
    options: [
        {
            name: 'liste',
            description: "Affiche la liste des tickets",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'utilisateur',
                    description: "Affiche le ticket d'un utilisateur",
                    type: ApplicationCommandOptionType.User,
                    required: false
                }
            ]
        },
        {
            name: "créer",
            description: "Créer un panel de ticket",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "sujet",
                    description: "Sujet du panel de tickets",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "salon",
                    description: "Salon du panel de ticket",
                    required: false,
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ ChannelType.GuildText ]
                },
                {
                    name: "description",
                    description: "Description du panel de tickets",
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'image',
                    description: "Image du panel",
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            name: 'supprimer',
            description: "Supprime un panel de tickets",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "identifiant",
                    description: "Identifiant du message du panel de tickets",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'modroles',
            description: "Gère les rôles de modérateurs de tickets",
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'liste',
                    description: "Affiche la liste des rôles de modérateurs de tickets",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "ajouter",
                    description: "Ajoute un rôle de modérateur de tickets",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'rôle',
                            description: "Rôle à rajouter",
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                },
                {
                    name: "retirer",
                    description: "Retirer un rôle de modérateur de tickets",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'rôle',
                            description: "Rôle à retirer",
                            type: ApplicationCommandOptionType.Role,
                            required: true
                        }
                    ]
                }
            ]
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    if (!interaction.client.modulesManager.enabled(interaction.guild.id, 'tickets')) return interaction.reply({
        embeds: [ replies.moduleDisabled(interaction.user, { guild: interaction.guild, module: 'tickets' }) ],
        ephemeral: true
    }).catch(() => {});

    const cmd = subcmd(options);

    if (options.data.filter(x => x.type === ApplicationCommandOptionType.SubcommandGroup).length === 0) {
        if (cmd === 'liste') {
            const list = interaction.client.ticketsManager.getTicketsList(interaction.guild.id).toJSON();
    
            if (list.length === 0) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setTitle("Pas de tickets")
                    .setDescription(`Aucun ticket n'est ouvert sur ce serveur`)
                    .setColor(evokerColor(interaction.guild))
                ]
            }).catch(() => {});
    
            const user = options.getUser('utilisateur') as User;
            if (user && !user.bot) {
                const ticket = list.find(x => x.user_id === user.id);
    
                if (!ticket) return interaction.reply({
                    embeds: [ basicEmbed(interaction.user)
                        .setTitle("Pas de ticket")
                        .setDescription(`${user} n'a pas ouvert de tickets sur ce serveur`)
                        .setColor(evokerColor(interaction.guild))
                    ]
                }).catch(() => {});
    
                interaction.reply({
                    embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                        .setTitle(`Ticket de ${user.username}`)
                        .setDescription(`Voici les informations du ticket de ${user}`)
                        .setFields(
                            {
                                name: "Salon",
                                value: pingChan(ticket.channel_id),
                                inline: true
                            },
                            {
                                name: "État",
                                value: ticket.state === 'closed' ? "Fermé" : 'Ouvert',
                                inline: true
                            }
                        )
                    ]
                }).catch(() => {});
                return;
            }
    
            const basic = () => {
                return basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle("Tickets")
                    .setDescription(`Il y a ${numerize(list.length)} ticket${plurial(list.length)} dans ce serveur`)
            }
            const map = (embed: EmbedBuilder, ticket: ticketChannels) => {
                return embed.addFields({
                    name: ticket.channelName,
                    value: `Ouvert par ${pingUser(ticket.user_id)}\n> Ticket ${ticket.state === 'open' ? 'ouvert' : 'fermé'} dans ${pingChan(ticket.channel_id)}`,
                    inline: false
                })
            }
    
            if (list.length <= 5) {
                const embed = basic();
                for (const ticket of list) {
                    map(embed, ticket)
                }
    
                interaction.reply({
                    embeds: [ embed ]
                }).catch(() => {});
            } else {
                const embeds = [basic()];
    
                list.forEach((v, i) => {
                    if (i % 5 === 0 && i > 0) embeds.push(basic());
    
                    map(embeds[embeds.length - 1], v)
                });
    
                pagination({
                    interaction,
                    user: interaction.user,
                    embeds
                });
            }
        }
        if (cmd === 'créer') {
            const subject = options.getString('sujet');
            const description = options.getString('description');
            const img = options.getAttachment('image');
            const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;
    
            if (img && !img.contentType.includes('image')) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setTitle("Image invalide")
                    .setDescription(`L'image fournie est invalide`)
                    .setColor(evokerColor(interaction.guild))
                ],
                ephemeral: true
            }).catch(() => {});
    
            const confirmation = await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user, { questionMark: true })
                    .setTitle("Création")
                    .setDescription(`Vous allez créer un panel de ticket dans ${pingChan(channel)}`)
                    .setFields({
                        name: 'Sujet',
                        value: resizeString({ str: subject, length: 200 }),
                        inline: true
                    }, {
                        name: 'Description',
                        value: description ? resizeString({ str: description, length: 200 }) : 'Pas de description',
                        inline: false
                    }, {
                        name: 'Image',
                        value: img ? `[Lien](${img.url})` : "Pas d'image"
                    })
            }).catch(() => {}) as confirmReturn;
    
            if (confirmation === 'cancel' || !confirmation?.value) return interaction.editReply({
                embeds: [ replies.cancel() ],
                components: []
            }).catch(() => {});
            await interaction.editReply({
                embeds: [ replies.wait(interaction.user) ],
                components: []
            }).catch(() => {});
    
            const rep = await interaction.client.ticketsManager.createPanel({
                guild: interaction.guild,
                channel,
                subject,
                description,
                image: img?.url,
                user: interaction.user
            }).catch(() => {}) as { embed: EmbedBuilder };
    
            interaction.editReply({
                embeds: [ rep.embed ]
            }).catch(() => {});
        }
        if (cmd === 'supprimer') {
            const id = options.getString('identifiant');
    
            const panel = interaction.client.ticketsManager.getPanelsList(interaction.guild.id).toJSON().find(x => x.message_id === id);
            if (!panel) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setColor(evokerColor(interaction.guild))
                    .setTitle("Panel introuvable")
                    .setDescription(`Ce panel n'existe pas`)
                ]
            }).catch(() => {});
    
            const confirmation = await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle("Suppression")
                    .setDescription(`Voulez-vous vraiment supprimer [ce panel](${getMsgUrl(panel)}) ?`)
            }).catch(() => {}) as confirmReturn;
    
            if (confirmation === 'cancel' || !confirmation?.value) return interaction.editReply({
                embeds: [ replies.cancel() ],
                components: []
            }).catch(() => {});
            await interaction.editReply({
                embeds: [ replies.wait(interaction.user) ],
                components: []
            }).catch(() => {});
    
            const res = await interaction.client.ticketsManager.deletePanel({
                guild: interaction.guild,
                user: interaction.user,
                message_id: id
            })
            interaction.editReply({
                embeds: [ res?.embed ]
            }).catch(() => {});
        }
    } else {
        if (cmd === 'liste') {
            const { roles } = interaction.client.ticketsManager.getServerModroles(interaction.guild.id);

            if (roles.length === 0) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setTitle("Pas de rôles")
                    .setDescription(`Aucun rôle n'est configuré sur ${interaction.guild.name}`)
                    .setColor(evokerColor(interaction.guild))
                ]
            }).catch(() => {});

            interaction.reply({
                embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle("Modérateurs de tickets")
                    .setDescription(`${numerize(roles.length)} rôle${plurial(roles.length, { singular: ' est configuré', plurial: 's sont configurés' })}\n${roles.map(pingRole).join(' ')}`)
                ]
            }).catch(() => {});
        };
        if (cmd === 'ajouter') {
            const role = options.getRole('rôle');
            if (role.position >= (interaction.member as GuildMember).roles.highest.position) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setColor(evokerColor(interaction.guild))
                    .setTitle("Rôle trop haut")
                    .setDescription(`Ce rôle est supérieur ou égal à vous dans la hiérarchie des rôles`)
                ],
                ephemeral: true
            }).catch(() => {});

            interaction.client.ticketsManager.addModRole({
                guild_id: interaction.guild.id,
                role_id: role.id
            });

            interaction.reply({
                embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle("Rôle ajouté")
                    .setDescription(`Le rôle ${pingRole(role.id)} a été ajouté à la liste des rôles de modérateur de tickets`)
                ]
            }).catch(() => {});
        }
        if (cmd === 'retirer') {
            const role = options.getRole('rôle');
            if (role.position >= (interaction.member as GuildMember).roles.highest.position) return interaction.reply({
                embeds: [ basicEmbed(interaction.user)
                    .setColor(evokerColor(interaction.guild))
                    .setTitle("Rôle trop haut")
                    .setDescription(`Ce rôle est supérieur ou égal à vous dans la hiérarchie des rôles`)
                ],
                ephemeral: true
            }).catch(() => {});

            interaction.client.ticketsManager.addModRole({
                guild_id: interaction.guild.id,
                role_id: role.id
            });

            interaction.reply({
                embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                    .setTitle("Rôle ajouté")
                    .setDescription(`Le rôle ${pingRole(role.id)} a été ajouté à la liste des rôles de modérateur de tickets`)
                ]
            }).catch(() => {});
        }
    }
});