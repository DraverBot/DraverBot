import { DraverCommand } from '../../structures/DraverCommand';
import { log4js } from 'amethystjs';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, AttachmentBuilder, GuildMember } from 'discord.js';
import { basicEmbed, chunkArray } from '../../utils/toolbox';
import { IsValidInput, caesarCryptor, caesarDecryptor, vigenereCipher, vigenereDecipher } from '../../utils/ciphers';
import replies from '../../data/replies';
import { rmSync, writeFileSync } from 'fs';
import { rotors, plugboard as defaultPlugboard, reflector } from '../../data/enigmaConfig.json';
import { Enigma, Plugboard, Reflector, Rotor } from 'enigma-machine';

export default new DraverCommand({
    name: 'chiffrage',
    module: 'fun',
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
            name: 'draver',
            description: 'Chiffre un message en utilisant la méthode Draver',
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
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            maxLength: 3850
                        },
                        {
                            name: 'clé',
                            description: 'Clé de chiffrement',
                            required: true,
                            maxLength: 50,
                            minLength: 5,
                            type: ApplicationCommandOptionType.String
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
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            maxLength: 3850
                        },
                        {
                            name: 'clé',
                            description: 'Clé du chiffrement',
                            required: true,
                            maxLength: 50,
                            minLength: 5,
                            type: ApplicationCommandOptionType.String
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
        if (group === 'draver') {
            const msg = options.getString('message')?.toLowerCase();
            const seed = options.getString('clé')?.toLowerCase();

            const alphabet = 'abcdefghijklmnopqrstuvwxyz ';
            if ([msg, seed].some((x) => x.split('').some((y) => !alphabet.includes(y))))
                return interaction
                    .reply({
                        embeds: [
                            basicEmbed(interaction.user, { evoker: interaction.guild })
                                .setTitle('Textes invalides')
                                .setDescription(
                                    `Les textes (clé et message) ne peuvent être constitués uniquement de lettres et d'espaces, sans accent`
                                )
                        ],
                        ephemeral: true
                    })
                    .catch(log4js.trace);

            const caesarFirstGap = Math[
                seed
                    .split('')
                    .map((s) => alphabet.indexOf(s))
                    .reduce((a, b) => a + b) %
                    17 >=
                5
                    ? 'ceil'
                    : 'floor'
            ]((alphabet.indexOf(seed[0]) + 1) * 1.2);
            const caesarAlphabetic = alphabet.indexOf(seed[1]) > alphabet.length / 2;
            const vigenereKey = seed.slice(
                alphabet.indexOf(seed[0]) + alphabet.indexOf(seed[1]) + alphabet.indexOf(seed[seed.length - 1]) === 1
                    ? 2
                    : 3
            );
            const rotorEven = alphabet.indexOf(seed[seed.length - 1]) % 2;
            const switchedKey = chunkArray(seed.split(''), 2)
                .map(([a, b]) => (!!a && !!b ? `${b}${a}` : a))
                .join('');
            const caesarSecondGap = Math.abs(Math.floor((alphabet.indexOf(vigenereKey[0]) - 1) * 0.9));
            const secondVigenereSpawn =
                (Math.abs(
                    seed
                        .split('')
                        .map((x) => alphabet.indexOf(x))
                        .reduce((a, b) => a + b, 0) *
                        (alphabet.indexOf(seed[0]) + alphabet.indexOf(seed[seed.length - 1]))
                ) %
                    alphabet.indexOf(
                        seed[
                            rotorEven +
                                (alphabet.indexOf(seed[Math.abs(rotorEven - alphabet.length)]) % alphabet.length)
                        ]
                    )) %
                    3 >
                1;
            const secondVigenereKey = seed
                .split('')
                .map(
                    (l, i) =>
                        alphabet[
                            Math.abs(
                                alphabet.indexOf(l) +
                                    ((alphabet.indexOf(seed[Math.abs(alphabet.length - i)]) * alphabet.indexOf(l)) %
                                        2 ===
                                    0
                                        ? -1
                                        : 1)
                            ) % alphabet.length
                        ]
                )
                .join('');

            let output = msg;
            if (cmd === 'chiffrer') {
                output = caesarCryptor({
                    input: output,
                    sens: caesarAlphabetic ? 'alphabetic' : 'reversed',
                    alphabet,
                    gap: caesarFirstGap
                });

                if (secondVigenereSpawn) output = vigenereCipher({ input: output, key: secondVigenereKey, alphabet });

                const machineRotors: [Rotor, Rotor, Rotor] = [
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 0 : 1].config))),
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 2 : 3].config))),
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 3 : 4].config)))
                ];
                const machineReflector = new Reflector(JSON.parse(JSON.stringify(reflector)));
                const machinePlugboard = new Plugboard(JSON.parse(JSON.stringify(defaultPlugboard)));

                const machine = new Enigma(machineRotors, machineReflector, machinePlugboard);

                output = output
                    .split(' ')
                    .map((v) => machine.calculateString(v))
                    .join(' ');

                output = caesarCryptor({
                    sens: caesarAlphabetic ? 'reversed' : 'alphabetic',
                    alphabet,
                    gap: caesarSecondGap,
                    input: output
                });
                output = vigenereCipher({ input: output, key: switchedKey, alphabet });
            } else {
                output = vigenereDecipher({ input: output, key: switchedKey, alphabet });

                output = caesarDecryptor({
                    sens: caesarAlphabetic ? 'reversed' : 'alphabetic',
                    alphabet,
                    gap: caesarSecondGap,
                    input: output
                });

                const machineRotors: [Rotor, Rotor, Rotor] = [
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 0 : 1].config))),
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 2 : 3].config))),
                    new Rotor(JSON.parse(JSON.stringify(rotors[rotorEven ? 3 : 4].config)))
                ];
                const machineReflector = new Reflector(JSON.parse(JSON.stringify(reflector)));
                const machinePlugboard = new Plugboard(JSON.parse(JSON.stringify(defaultPlugboard)));

                const machine = new Enigma(machineRotors, machineReflector, machinePlugboard);

                output = output
                    .split(' ')
                    .map((v) => machine.calculateString(v))
                    .join(' ');
                if (secondVigenereSpawn) output = vigenereDecipher({ input: output, key: secondVigenereKey, alphabet });

                output = caesarDecryptor({
                    input: output,
                    sens: caesarAlphabetic ? 'alphabetic' : 'reversed',
                    alphabet,
                    gap: caesarFirstGap
                });
            }

            interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle('Chiffre de Draver')
                            .setDescription(
                                `Voici votre message ${vocabulary[cmd].adj} selon l'algorithme de Draver : \`\`\`${output}\`\`\``
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        }
    }
});
