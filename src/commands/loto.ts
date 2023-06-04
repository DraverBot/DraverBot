import { AmethystCommand, log4js, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType, ChannelType, GuildMember, TextChannel } from 'discord.js';
import time from '../preconditions/time';
import { util } from '../utils/functions';
import ms from 'ms';
import moduleEnabled from '../preconditions/moduleEnabled';
import replies from '../data/replies';
import { basicEmbed } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'loto',
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
                            guild: interaction.guild
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
        const loto = await interaction.client.lotoManager
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
                            guild: interaction.guild
                        })
                    ]
                })
                .catch(log4js.trace);

        const loto = interaction.client.lotoManager.getGuildLoto(interaction.guild.id);
        if (!loto)
            return interaction
                .reply({ embeds: [replies.loto.noCurrentLoto(interaction.user, interaction.guild)] })
                .catch(log4js.trace);

        const results = interaction.client.lotoManager.end(loto.id);
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
});
