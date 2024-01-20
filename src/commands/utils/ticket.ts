import { ticketsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { basicEmbed, confirm, subcmd, systemReply } from '../../utils/toolbox';
import { confirmReturn } from '../../typings/functions';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'ticket',
    module: 'tickets',
    description: 'Interagissez avec le système de tickets',
    options: [
        {
            name: 'créer',
            description: 'Créer un ticket',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'sujet',
                    description: 'Sujet du ticket',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'ajouter',
            description: 'Ajoute un utilisateur au ticket',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'utilisateur',
                    description: 'Utilisateur à ajouter',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: 'retirer',
            description: 'Retire un utilisateur du ticket',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'utilisateur',
                    description: 'Utilisateur à retirer',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: 'fermer',
            description: 'Ferme un ticket',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'réouvrir',
            description: 'Réouvrir le ticket',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'supprimer',
            description: 'Supprime le ticket',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'sauvegarder',
            description: 'Sauvegarde le ticket',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    preconditions: [preconditions.GuildOnly, moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);
    const checkTicket = () => {
        if (
            !ticketsManager.tickets.find(
                (x) => x.guild_id === interaction.guild.id && x.channel_id === interaction.channel.id
            )
        ) {
            systemReply(interaction, {
                ephemeral: true,
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Ticket invalide')
                        .setDescription(`Ce salon n'est pas un ticket`)
                ]
            }).catch(() => {});
            return false;
        }
        return true;
    };

    if (cmd === 'créer') {
        const sujet = options.getString('sujet');
        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(() => {});

        const res = await ticketsManager.createTicket<false>({
            guild: interaction.guild,
            user: interaction.user,
            subject: sujet
        });

        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'ajouter') {
        if (!checkTicket()) return;
        const user = options.getUser('utilisateur');
        await interaction.deferReply().catch(() => {});

        const res = await ticketsManager.addOrRemoveUser({
            channel_id: interaction.channel.id,
            user,
            guild: interaction.guild,
            action: 'add'
        });

        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'retirer') {
        if (!checkTicket()) return;
        const user = options.getUser('utilisateur');
        await interaction.deferReply().catch(() => {});

        const res = await ticketsManager.addOrRemoveUser({
            guild: interaction.guild,
            user,
            channel_id: interaction.channel.id,
            action: 'remove'
        });

        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'fermer') {
        if (!checkTicket()) return;

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Fermeture')
                .setDescription(`Voulez-vous vraiment fermer le ticket ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});
        const ticket = ticketsManager
            .getTicketsList(interaction.guild.id)
            .find((x) => x.channel_id === interaction.channel.id);

        const res = await ticketsManager.closeTicket({
            guild: interaction.guild,
            message_id: ticket.message_id,
            user: interaction.user
        });
        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'réouvrir') {
        if (!checkTicket()) return;
        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Réouverture')
                .setDescription(`Voulez-vous vraiment réouvrir le ticket ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});
        const ticket = ticketsManager
            .getTicketsList(interaction.guild.id)
            .find((x) => x.channel_id === interaction.channel.id);

        const res = await ticketsManager.reopenTicket({
            guild: interaction.guild,
            message_id: ticket.message_id,
            user: interaction.user
        });

        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'supprimer') {
        if (!checkTicket()) return;

        const confirmation = (await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression')
                .setDescription(`Voulez-vous vraiment supprimer le ticket ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});
        await interaction
            .editReply({
                embeds: [replies.wait(interaction.user)],
                components: []
            })
            .catch(() => {});
        const ticket = ticketsManager
            .getTicketsList(interaction.guild.id)
            .find((x) => x.channel_id === interaction.channel.id);

        const res = await ticketsManager.deleteTicket({
            guild: interaction.guild,
            message_id: ticket.message_id,
            user: interaction.user
        });

        if (res.ticket) return;
        interaction
            .editReply({
                embeds: [res.embed]
            })
            .catch(() => {});
    }
    if (cmd === 'sauvegarder') {
        if (!checkTicket()) return;

        await interaction.deferReply();

        const res = await ticketsManager.saveTicket({
            channel_id: interaction.channel.id,
            user: interaction.user,
            guild: interaction.guild
        });

        if (!res.id) {
            interaction
                .editReply({
                    embeds: [res.embed]
                })
                .catch(() => {});
            return;
        }

        const at = new AttachmentBuilder(`./dist/saves/${res.id}.html`)
            .setName(`${interaction.channel.name}.html`)
            .setDescription(
                `Sauvegarde générée le ${new Date().toLocaleDateString(
                    'fr'
                )} à ${new Date().getHours()}:${new Date().getMinutes()}`
            );
        interaction
            .editReply({
                embeds: [res.embed],
                files: [at]
            })
            .catch(() => {});
    }
});
