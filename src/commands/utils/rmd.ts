import { RemindsManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js } from 'amethystjs';
import { ApplicationCommandOptionType, EmbedBuilder, TextChannel } from 'discord.js';
import moduleEnabled from '../../preconditions/moduleEnabled';
import time from '../../preconditions/time';
import {
    basicEmbed,
    confirm,
    evokerColor,
    pagination,
    pingChan,
    plurial,
    resizeString,
    secondsToWeeks,
    subcmd
} from '../../utils/toolbox';
import ms from 'ms';
import { RemindsPlaceType, reminds } from '../../typings/managers';
import { confirmReturn } from '../../typings/functions';
import replies from '../../data/replies';

export default new DraverCommand({
    name: 'rappel',
    module: 'misc',
    description: 'Gère les rappels',
    options: [
        {
            name: 'créer',
            description: 'Créer un rappel',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'raison',
                    description: 'Raison du rappel',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'temps',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    description: 'Temps du rappel'
                },
                {
                    name: 'endroit',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    description: 'Endroit du rappel',
                    choices: [
                        {
                            name: 'En messages privés',
                            value: 'mp'
                        },
                        {
                            name: 'Dans ce salon',
                            value: 'achannel'
                        }
                    ]
                },
                {
                    name: 'récurrent',
                    required: false,
                    type: ApplicationCommandOptionType.Boolean,
                    description: 'Si le rappel doit se répéter'
                }
            ]
        },
        {
            name: 'liste',
            description: 'Affiche la liste de vos rappels',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'supprimer',
            description: 'Supprime un rappel',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'rappel',
                    description: 'Rappel à supprimer',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        }
    ],
    preconditions: [moduleEnabled, time]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'créer') {
        const reason = options.getString('raison');
        const time = ms(options.getString('temps'));
        const repeat = options.getBoolean('récurrent') ?? false;
        const place = (options.getString('endroit') as RemindsPlaceType) ?? 'mp';

        if (repeat && time < 600000)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Durée invalide')
                            .setDescription(
                                `Vous devez mettre une durée d'au moins dix minutes pour avoir un rappel récurrent`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        await interaction.deferReply().catch(() => {});

        await RemindsManager.setRemind({
            user_id: interaction.user.id,
            place,
            channel: interaction.channel as TextChannel,
            time,
            reason,
            repeat
        });

        interaction
            .editReply({
                content: `Entendu, je vous rappelle pour \`${reason}\` dans ${secondsToWeeks(Math.floor(time / 1000))}`
            })
            .catch(() => {});
    }
    if (cmd === 'liste') {
        const list = RemindsManager.getUserReminds(interaction.user.id).toJSON();
        if (list.length === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Pas de rappel')
                            .setDescription(`Vous n'avez aucun rappel configuré`)
                            .setColor(evokerColor(interaction.guild))
                    ]
                })
                .catch(() => {});

        const basic = () => {
            return basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Rappels')
                .setDescription(`Vous avez **${list.length} rappel${plurial(list.length)}**`);
        };
        const map = (embed: EmbedBuilder, rmd: reminds) => {
            return embed.addFields({
                name: resizeString({ str: rmd.reason, length: 50 }),
                value: `Rappel crée <t:${Math.floor(parseInt(rmd.setDate) / 1000)}:R>, <t:${Math.floor(
                    rmd.at / 1000
                )}:R>\n> ${
                    rmd.place === 'mp' ? 'En messages privés' : `Dans ${pingChan(rmd.channel_id)}`
                }\n> Identifiant: \`${rmd.id}\``
            });
        };
        await interaction.deferReply().catch(() => {});
        if (list.length <= 5) {
            const embed = basic();
            for (const rmd of list) {
                map(embed, rmd);
            }

            interaction
                .editReply({
                    embeds: [embed]
                })
                .catch(() => {});
        } else {
            const embeds = [basic()];
            list.forEach((v, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(basic());

                map(embeds[embeds.length - 1], v);
            });

            pagination({
                interaction,
                user: interaction.user,
                embeds
            });
        }
    }
    if (cmd === 'supprimer') {
        const id = options.getString('rappel');
        const rmd = RemindsManager.cache.get(parseInt(id));

        const confirmation = (await confirm({
            user: interaction.user,
            interaction,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression')
                .setDescription(`Voulez-vous supprimer le rappel \`${rmd.reason}\` ?`)
        }).catch(() => {})) as confirmReturn;

        if (confirmation === 'cancel' || !confirmation?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel(interaction)],
                    components: []
                })
                .catch(() => {});

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Rappel supprimé')
                        .setDescription(`J'ai supprimé le rappel \`${rmd.reason}\``)
                ],
                components: []
            })
            .catch(() => {});
        RemindsManager.deleteRemind(parseInt(id)).catch(() => {});
    }
});
