import { AmethystCommand, log4js } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, AttachmentBuilder, GuildMember } from 'discord.js';
import { basicEmbed } from '../utils/toolbox';
import { IsValidInput, caesarCryptor, caesarDecryptor, vigenereCipher, vigenereDecipher } from '../utils/ciphers';
import replies from '../data/replies';
import { rmSync, writeFileSync } from 'fs';

export default new AmethystCommand({
    name: 'chiffrage',
    description: 'Chiffre des messages',
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'césar',
            description: 'Chiffre un code avec le chiffre de César',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'chiffrer',
                    description: 'Chiffre un code avec le chiffre de César',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message',
                            description: 'Message que vous voulez chiffrer',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            maxLength: 3980
                        },
                        {
                            name: 'espacement',
                            description: 'Espacement',
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1,
                            required: true
                        },
                        {
                            name: 'sens',
                            description: 'Sens du chiffrement',
                            required: false,
                            type: ApplicationCommandOptionType.String,
                            choices: [
                                {
                                    name: 'Alphabétique',
                                    value: 'alphabetic'
                                },
                                {
                                    name: 'Désalphabétique',
                                    value: 'reversed'
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'déchiffrer',
                    description: 'Déchiffre un code avec le chiffre de César',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message',
                            description: 'Message que vous voulez chiffrer',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            maxLength: 3980
                        },
                        {
                            name: 'espacement',
                            description: 'Espacement',
                            type: ApplicationCommandOptionType.Integer,
                            minValue: 1,
                            required: true
                        },
                        {
                            name: 'sens',
                            description: 'Sens du chiffrement',
                            required: false,
                            type: ApplicationCommandOptionType.String,
                            choices: [
                                {
                                    name: 'Alphabétique',
                                    value: 'alphabetic'
                                },
                                {
                                    name: 'Désalphabétique',
                                    value: 'reversed'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            name: 'vigenère',
            description: 'Chiffre un message selon le chiffre de Blaise de Vigenère',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'chiffrer',
                    description: 'Chiffre un message',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message',
                            description: 'Message à chiffrer',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 3900
                        },
                        {
                            name: 'clé',
                            description: 'Clé du chiffrage',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 50
                        }
                    ]
                },
                {
                    name: 'déchiffrer',
                    description: 'Déchiffre un message',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message',
                            description: 'Message à déchiffrer',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 3900
                        },
                        {
                            name: 'clé',
                            description: 'Clé du chiffrage',
                            required: true,
                            type: ApplicationCommandOptionType.String,
                            maxLength: 50
                        }
                    ]
                }
            ]
        },
        {
            name: 'morse',
            description: 'Chiffre ou déchiffrer un message en morse',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'message',
                    description: 'Message à chiffrer',
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const cmd = options.getSubcommand();

    if (cmd === 'morse') {
        const msg = options.getString('message').toLowerCase();
        const regex = /^(([.-]{1,6} ?)+( \/ [.-]{1,6})?)+$/;

        const characters = [
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'i',
            'j',
            'k',
            'l',
            'm',
            'n',
            'o',
            'p',
            'q',
            'r',
            's',
            't',
            'u',
            'v',
            'w',
            'x',
            'y',
            'z',
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '.',
            ',',
            '?',
            "'",
            '!',
            '/',
            '(',
            ')',
            '&',
            ':',
            ';',
            '=',
            '+',
            '-',
            '_',
            '"',
            '$',
            '@'
        ];

        const morseCodes = [
            '.-',
            '-...',
            '-.-.',
            '-..',
            '.',
            '..-.',
            '--.',
            '....',
            '..',
            '.---',
            '-.-',
            '.-..',
            '--',
            '-.',
            '---',
            '.--.',
            '--.-',
            '.-.',
            '...',
            '-',
            '..-',
            '...-',
            '.--',
            '-..-',
            '-.--',
            '--..',
            '-----',
            '.----',
            '..---',
            '...--',
            '....-',
            '.....',
            '-....',
            '--...',
            '---..',
            '----.',
            '.-.-.-',
            '--..--',
            '..--..',
            '.----.',
            '-.-.--',
            '-..-.',
            '-.--.',
            '-.--.-',
            '.-...',
            '---...',
            '-.-.-.',
            '-...-',
            '.-.-.',
            '-....-',
            '..--.-',
            '-.--.',
            '-.--.-',
            '.-..-.',
            '...-..-',
            '.----.'
        ];

        if (regex.test(msg)) {
            const words = msg.split(' / ');
            const ciphered = words
                .map((w) =>
                    w
                        .split(' ')
                        .map((l) => (morseCodes.includes(l) ? characters[morseCodes.indexOf(l)] : l))
                        .join('')
                )
                .join(' ');

            const base = `Voici votre code déchiffré selon un code morse :\n\`\`\`{code}\`\`\``;
            if (base.replace('{code}', ciphered).length > 4096) {
                const path = `./dist/data/morse-${interaction.user.id}.txt`;
                writeFileSync(path, ciphered);

                await interaction
                    .reply({
                        content: 'Voici votre déchiffré',
                        ephemeral: true,
                        files: [new AttachmentBuilder(path, { name: 'morse.txt' })]
                    })
                    .catch(log4js.trace);

                rmSync(path);
            } else {
                interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Morse')
                                .setDescription(base.replace('{code}', ciphered))
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
            }
        } else {
            if (msg.split('').some((x) => ![...characters, ' '].includes(x)))
                return interaction
                    .reply({
                        embeds: [
                            replies.invalidInput((interaction.member as GuildMember) ?? interaction.user, {
                                letters: characters.join('')
                            })
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);

            const words = msg.split(' ');
            const ciphered = words
                .map((w) =>
                    w
                        .split('')
                        .map((l) => morseCodes[characters.indexOf(l)])
                        .join(' ')
                )
                .join(' / ');

            const base = `Voici votre code chiffré en morse :\n\`\`\`{code}\`\`\``;
            if (base.replace('{code}', ciphered).length > 4096) {
                const path = `./dist/data/morse-${interaction.user.id}.txt`;
                writeFileSync(path, ciphered);

                await interaction
                    .reply({
                        content: 'Voici votre code chiffré en morse',
                        ephemeral: true,
                        files: [new AttachmentBuilder(path, { name: 'morse.txt' })]
                    })
                    .catch(log4js.trace);

                rmSync(path);
            } else {
                interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { draverColor: true })
                                .setTitle('Morse')
                                .setDescription(base.replace('{code}', ciphered))
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
            }
        }
    }
    if (cmd === 'chiffrer' || cmd === 'déchiffrer') {
        const group = options.getSubcommandGroup();

        const vocabulary = {
            chiffrer: {
                adj: 'chiffré'
            },
            déchiffrer: {
                adj: 'déchiffré'
            }
        };
        if (group === 'césar') {
            const content = options.getString('message');
            const gap = options.getInteger('espacement');
            const sens = (options.getString('sens') ?? 'alphabetic') as 'reversed' | 'alphabetic';

            if (!IsValidInput(content))
                return interaction
                    .reply({
                        embeds: [replies.invalidInput((interaction.member as GuildMember) ?? interaction.user)],
                        ephemeral: true
                    })
                    .catch(log4js.trace);

            const ciphered = (cmd === 'chiffrer' ? caesarCryptor : caesarDecryptor)({ input: content, sens, gap });

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Chiffre de César')
                            .setDescription(
                                `Voici votre message ${vocabulary[cmd].adj} selon le chiffre de César :\n\`\`\`${ciphered}\`\`\``
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        }
        if (group === 'vigenère') {
            const content = options.getString('message');
            const key = options.getString('clé');

            if (!IsValidInput(content))
                return interaction
                    .reply({
                        embeds: [replies.invalidInput((interaction.member as GuildMember) ?? interaction.user)],
                        ephemeral: true
                    })
                    .catch(log4js.trace);
            if (!IsValidInput(key))
                return interaction
                    .reply({
                        embeds: [
                            replies.invalidInput((interaction.member as GuildMember) ?? interaction.user, {
                                test: 'key'
                            })
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);

            const ciphered = (cmd === 'chiffrer' ? vigenereCipher : vigenereDecipher)({ input: content, key });

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(`Chiffre de Vigenère`)
                            .setDescription(
                                `Voici votre message ${vocabulary[cmd].adj} selon le chiffre de Vigenère avec la clé \`${key}\`\n\`\`\`${ciphered}\`\`\``
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        }
    }
});
