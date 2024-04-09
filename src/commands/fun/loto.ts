import { lotoManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, ChannelType, GuildMember, TextChannel } from 'discord.js';
import time from '../../preconditions/time';
import { util } from '../../utils/functions';
import ms from 'ms';
import moduleEnabled from '../../preconditions/moduleEnabled';
import replies from '../../data/replies';
import { basicEmbed, confirm, displayDate, numerize, plurial } from '../../utils/toolbox';

export default new DraverCommand({
    name: 'loto',
    module: 'economy',
    description: 'Joue au loto sur le serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled, time],
    options: [
        {
            name: 'créer',
            description: 'Crée un loto',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'durée',
                    description: 'Durée du loto',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'nombres',
                    description: 'Nombre de numéros gagnants',
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 3,
                    maxValue: 50,
                    required: false
                },
                {
                    name: 'complémentaires',
                    description: 'Nombre de numéros complémentaires',
                    minValue: 0,
                    maxValue: 50,
                    required: false,
                    type: ApplicationCommandOptionType.Integer
                },
                {
                    name: util<string>('coins').toLowerCase(),
                    description: `Nombre ${util('coinsPrefix')} que vous voulez donner`,
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    required: false
                },
                {
                    name: 'salon',
                    description: 'Salon dans lequel le message de fin de loto sera envoyé',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText],
                    required: false
                }
            ]
        },
        {
            name: 'tirage',
            description: 'Fait le tirage du loto en cours',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'participer',
            description: 'Participez au loto du serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'gagnants',
                    description: 'Vos numéros gagnants (séparés par un espace)',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'complémentaires',
                    description:
                        "Vos numéros complémentaires (écrivez n'importe quoi si les numéros ne sont pas nécessaires",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        },
        {
            name: 'abandonner',
            description: 'Annule votre participation au loto',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'annuler',
            description: 'Annule le loto',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'afficher',
            description: 'Affiche le loto en cours',
            type: ApplicationCommandOptionType.Subcommand
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd == 'créer') {
        if (!(interaction.member as GuildMember).permissions.has('ManageGuild'))
            return interaction
                .reply({
                    ephemeral: true,
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: ['ManageChannels'] },
                            guild: interaction.guild,
                            lang: interaction
                        })
                    ]
                })
                .catch(log4js.trace);

        const time = ms(options.getString('durée'));
        const numbers = options.getInteger('nombres') ?? 5;
        const complementaries = options.getInteger('complémentaires') ?? 2;
        const coins = options.getInteger(util<string>('coins').toLowerCase()) ?? 0;
        const channel = (options.getChannel('salon') ?? interaction.channel) as TextChannel;

        const startedAt = Date.now();
        const endsAt = startedAt + time;

        await interaction.deferReply().catch(log4js.trace);
        const loto = await lotoManager
            .create({
                time,
                numbers,
                complementaries,
                coins,
                channel_id: channel.id,
                guild_id: interaction.guild.id
            })
            .catch(log4js.trace);

        if (!loto || loto == 'unable to database the loto')
            return interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Erreur de lancement')
                            .setDescription(
                                `Le loto n'a pas pu être démarré à cause d'une erreur interne. L'erreur a été signalée au développeur.\nRéessayez la commande, si l'erreur persiste, contactez le [serveur de support](${util(
                                    'support'
                                )})`
                            )
                    ]
                })
                .catch(log4js.trace);
        if (loto == 'loto already started')
            return interaction
                .editReply({ embeds: [replies.loto.lotoAlreadyStarted(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [replies.loto.lotoStarted(interaction.user, { coins, numbers, complementaries, endsAt })]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'tirage') {
        if (!(interaction.member as GuildMember).permissions.has('ManageGuild'))
            return interaction
                .reply({
                    ephemeral: true,
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: ['ManageChannels'] },
                            guild: interaction.guild,
                            lang: interaction
                        })
                    ]
                })
                .catch(log4js.trace);

        const loto = lotoManager.getGuildLoto(interaction.guild.id);
        if (!loto)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        const results = lotoManager.end(loto.id);
        if (results == 'unexisting loto')
            return interaction
                .reply({
                    embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)]
                })
                .catch(log4js.trace);
        interaction
            .reply({
                embeds: [replies.loto.lotoResult(interaction.user, results.rolled, results.winners)]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'participer') {
        const gagnants = options.getString('gagnants', true);
        const complementaries = options.getString('complémentaires', true);

        const formatting = {
            gagnants: gagnants
                .split(/ +/g)
                .map((x) => parseInt(x))
                .filter((x) => !isNaN(x) && x <= 100 && x > 0),
            complementaries: complementaries
                .split(/ +/g)
                .map((x) => parseInt(x))
                .filter((x) => !isNaN(x) && x <= 100 && x > 0)
        };

        const loto = lotoManager.getGuildLoto(interaction.guild.id);

        if (!loto || !loto.availableForJoin)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);
        const registration = lotoManager.registerParticipation(loto.id, {
            userId: interaction.user.id,
            numbers: formatting.gagnants,
            complementaries: formatting.complementaries
        });

        if (registration == 'unexisting loto')
            return interaction
                .reply({
                    embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)]
                })
                .catch(log4js.trace);
        if (registration == 'user is already participating to the loto')
            return interaction
                .reply({ embeds: [replies.loto.alreadyParticipate(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        if (registration == 'invalid numbers array' || registration == 'one of arrays has duplicates')
            return interaction
                .reply({
                    embeds: [
                        replies.loto.invalidParticipation(interaction.user, interaction.guild, {
                            numbers: loto.numbers,
                            complementaries: loto.complementaries
                        })
                    ]
                })
                .catch(log4js.trace);

        interaction
            .reply({
                embeds: [replies.loto.participationRegistered(interaction.user)]
            })
            .catch(log4js.trace);
    }
    if (cmd == 'abandonner') {
        const loto = lotoManager.getGuildLoto(interaction.guild.id);
        if (!loto || loto.ended)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);
        if (!loto.isParticipating(interaction.user.id))
            return interaction
                .reply({ embeds: [replies.loto.noParticipation(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user, { questionMark: true })
                .setTitle('❓ | Annulation')
                .setDescription(`Êtes-vous sûr d'annuler votre participation au loto ?`),
            ephemeral: true
        }).catch(log4js.trace);

        if (!confirmation || confirmation == 'cancel' || !confirmation.value)
            return interaction.editReply({ embeds: [replies.cancel(interaction)], components: [] }).catch(log4js.trace);
        const annulation = lotoManager.unregisterParticipation(loto.id, interaction.user.id);

        // This should never be called
        if (annulation == 'unexisting loto')
            return interaction
                .editReply({
                    embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)],
                    components: []
                })
                .catch(log4js.trace);

        // This should never be called
        if (annulation == 'user is not participating in the loto')
            return interaction
                .editReply({
                    embeds: [replies.loto.noParticipation(interaction.user, interaction.guild)],
                    components: []
                })
                .catch(log4js.trace);

        interaction
            .editReply({ embeds: [replies.loto.participationDeleted(interaction.user)], components: [] })
            .catch(log4js.trace);
    }
    if (cmd == 'annuler') {
        if (!(interaction.member as GuildMember).permissions.has('ManageGuild'))
            return interaction
                .reply({
                    embeds: [
                        replies.userMissingPermissions(interaction.user, {
                            permissions: { missing: ['ManageGuild'] },
                            guild: interaction.guild,
                            lang: interaction
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        const loto = lotoManager.getGuildLoto(interaction.guild.id);
        if (!loto)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);
        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user, { questionMark: true })
                .setTitle(`❓| Annulation du loto`)
                .setDescription(`Êtes-vous sûr de vouloir annuler le loto ?`)
        }).catch(log4js.trace);

        if (!confirmation || confirmation == 'cancel' || !confirmation.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(log4js.trace);

        lotoManager.cancelLoto(loto.id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Loto annulé')
                        .setDescription(`Le loto a été annulé`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd == 'afficher') {
        const loto = lotoManager.getGuildLoto(interaction.guild.id);
        if (!loto)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        const embed = basicEmbed(interaction.user, { draverColor: true })
            .setTitle('Loto')
            .setDescription(
                `Le loto se finit ${displayDate(parseInt(loto.endsAt))}\n\nModalités :\n* ${numerize(
                    loto.numbers
                )} numéros gagnants nécessaires\n* ${numerize(loto.complementaries)} numéro${plurial(
                    loto.complementaries
                )} complémentaire${plurial(loto.complementaries)} nécessaires${
                    loto.coins > 0
                        ? `\n* ${numerize(loto.coins)} ${util('coins')} sont en jeu à partager entre les gagnants`
                        : ''
                }`
            );
        if (loto.availableForJoin) {
            embed.addFields({
                name: 'Participer',
                value: 'Pour participer, utilisez la commande `/loto participer` suivie de vos numéros',
                inline: false
            });
        } else {
            embed.addFields({
                name: 'Terminer',
                value: 'Pour terminer le lot, utilisez la commande `/loto tirage`',
                inline: false
            });
        }

        interaction
            .reply({
                embeds: [embed]
            })
            .catch(log4js.trace);
    }
});
