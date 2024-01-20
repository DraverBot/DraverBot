import { passwords } from '../cache/managers';
import { DraverCommand } from '../structures/DraverCommand';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { WordGenerator } from '../managers/Generator';
import moduleEnabled from '../preconditions/moduleEnabled';
import { basicEmbed, confirm, evokerColor, paginatorize, subcmd, systemReply } from '../utils/toolbox';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export default new DraverCommand({
    name: 'password',
    module: 'misc',
    description: 'Gère vos mots de passe',
    options: [
        {
            name: 'générer',
            description: 'Génère un mot de passe',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'longueur',
                    minValue: 1,
                    type: ApplicationCommandOptionType.Integer,
                    required: false,
                    description: 'Longueur en caractères de votre mot de passe',
                    maxValue: 256
                },
                {
                    name: 'majuscules',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false,
                    description: 'Précise si le mot de passe doit inclure des majuscules'
                },
                {
                    name: 'nombres',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false,
                    description: 'Précise si le mot de passe doit inclure des nombres'
                },
                {
                    name: 'spéciaux',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false,
                    description: 'Précise si le mot de passe doit inclure des caractères spéciaux'
                },
                {
                    name: 'additionels',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                    description: 'Des caractères additionels que vous voulez ajouter dans le mot de passe'
                },
                {
                    name: 'nom',
                    description: 'Nom sous lequel votre mot de passe sera enregistré',
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: 'sauvegarder',
            description: 'Sauvegarde votre mot de passe',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: 'Nom sous lequel le mot de passe sera enregistré',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'password',
                    description: 'Votre mot de passe',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'voir',
            description: 'Affiche un de vos mots de passe',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'password',
                    description: 'Votre mot de passe',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'supprimer',
            description: 'Supprime un mot de passe de Draver',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'password',
                    description: 'Mot de passe à supprimer',
                    required: true,
                    autocomplete: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = subcmd(options);

    if (cmd === 'générer') {
        const size = options.getInteger('longueur') ?? 16;
        const majuscules = options.getBoolean('majuscules') ?? true;
        const numbers = options.getBoolean('nombres') ?? true;
        const specials = options.getBoolean('spéciaux') ?? true;
        const add = options.getString('additionels') ?? '';
        const name = options.getString('nom');

        if (name && passwords.getPassword(interaction.user.id, name))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user)
                            .setTitle('Mot de passe déjà existant')
                            .setDescription(`Vous avez déjà un mot de passe sous le nom de **${name}**`)
                            .setColor(evokerColor(interaction.guild))
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        const password = new WordGenerator({
            length: size,
            letters: true,
            numbers: numbers,
            overload: add,
            special: specials,
            capitals: majuscules
        }).generate();

        if (name) passwords.printPassword(interaction.user.id, name, password);

        interaction
            .reply({
                content: `${
                    name ? `Votre mot de passe a été enregistré dans **${name}**` : 'Voici votre mot de passe'
                } :\`\`\`${password}\`\`\``,
                ephemeral: true
            })
            .catch(() => {});
    }
    if (cmd === 'sauvegarder') {
        const name = options.getString('nom');
        const value = options.getString('password');

        if (passwords.getPassword(interaction.user.id, name)) {
            const confirmation = (await confirm({
                interaction,
                user: interaction.user,
                ephemeral: true,
                embed: basicEmbed(interaction.user)
                    .setTitle('Sauvegarde')
                    .setDescription(
                        `Vous avez déjà un mot de passe avec le nom **${name}**, voulez-vous modifier le mot de passe ?`
                    )
            }).catch(() => {})) as confirmReturn;

            if (confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(() => {});
        }

        passwords.printPassword(interaction.user.id, name, value);

        systemReply(interaction, {
            ephemeral: true,
            components: [],
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Mot de passe sauvegardé')
                    .setDescription(`Votre mot de passe a été enregistré sous le nom de \`${name}\``)
            ]
        });
    }
    if (cmd === 'voir') {
        const password = options.getString('password');
        const value = passwords.getPassword(interaction.user.id, password);

        if (value) {
            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setDescription(`Voici le mot de passe **${password}** :\`\`\`${value}\`\`\``)
                            .setTitle('Mot de passe')
                    ],
                    ephemeral: true
                })
                .catch(() => {});
        } else {
            const list = passwords.getPasswords(interaction.user.id);

            const mapper = (embed: EmbedBuilder, item: { name: string; password: string }) => {
                if (embed.data?.fields?.length === 2)
                    embed.addFields({
                        name: '\u200b',
                        value: '\u200b',
                        inline: false
                    });

                return embed.addFields({
                    name: item.name,
                    value: `\`/password voir password: ${item.name}\``,
                    inline: embed.data?.fields?.length < 5 || !embed.data.fields
                });
            };
            const embedder = () => {
                return basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Mots de passe')
                    .setDescription(`Voici votre liste de mots de passe`);
            };

            if (list.length <= 5) {
                const embed = embedder();

                list.forEach((x) => {
                    mapper(embed, x);
                });

                interaction
                    .reply({
                        embeds: [embed],
                        ephemeral: true
                    })
                    .catch(() => {});
            } else {
                paginatorize({
                    array: list,
                    embedFunction: embedder,
                    mapper,
                    interaction,
                    user: interaction.user,
                    ephemeral: true
                });
            }
        }
    }
    if (cmd === 'supprimer') {
        const password = options.getString('password');

        const result = (await confirm({
            interaction,
            user: interaction.user,
            ephemeral: true,
            embed: basicEmbed(interaction.user)
                .setTitle('Suppression de mot de passe')
                .setDescription(`Êtes-vous sûr de supprimer le mot de passe **${password}** ?`)
        }).catch(() => {})) as confirmReturn;

        if (result === 'cancel' || !result?.value)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        passwords.deletePassword(interaction.user.id, password);
        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Mot de passe supprimé')
                        .setDescription(`Le mot de passe **${password}** a été supprimé`)
                ],
                components: []
            })
            .catch(() => {});
    }
});
