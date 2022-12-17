import { AmethystCommand, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, EmbedBuilder, GuildMember, Message } from 'discord.js';
import replies from '../data/replies';
import { shifumiSign, ShifumiSigns, shifumiSigns } from '../typings/commands';
import { basicEmbed, buildButton, nickname, pingUser, random, row, waitForReplies } from '../utils/toolbox';
import { yesNoRow } from '../data/buttons';
import moduleEnabled from '../preconditions/moduleEnabled';

export default new AmethystCommand({
    name: 'shifumi',
    description: 'Joue au shifumi',
    options: [
        {
            name: 'adversaire',
            description: 'Adversaire que vous voulez affronter',
            required: false,
            type: ApplicationCommandOptionType.User
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(async ({ interaction, options }) => {
    const user = options.getUser('adversaire');
    const btn = (sign: shifumiSign) => {
        return buildButton({
            label: sign.name,
            emoji: sign.emoji,
            style: 'Primary',
            id: sign.key
        });
    };
    const signs = row(btn(shifumiSigns.pierre), btn(shifumiSigns.feuille), btn(shifumiSigns.ciseaux));

    const compareSigns = (one: shifumiSign, two: shifumiSign) => {
        if (one.key === two.key) return 'e';

        const beats = {};
        beats[ShifumiSigns.Paper] = ShifumiSigns.Rock;
        beats[ShifumiSigns.Rock] = ShifumiSigns.Scisors;
        beats[ShifumiSigns.Scisors] = ShifumiSigns.Paper;

        if (beats[one.key] === two.key) return 'o';
        if (beats[two.key] === one.key) return 't';
        return 'e';
    };

    const embeds: Record<ReturnType<typeof compareSigns>, EmbedBuilder> = {
        e: basicEmbed(interaction.user, { defaultColor: true })
            .setTitle('Égalité')
            .setDescription((user ? `Vous avez fait` : 'Nous avons fait') + ` égalité`),
        o: basicEmbed(interaction.user, { defaultColor: true })
            .setTitle(`Victoire`)
            .setDescription(`${interaction.user} a gagné`),
        t: basicEmbed(interaction.user, { defaultColor: true })
            .setTitle(`Défaite`)
            .setDescription(`${user ? `${user} a gagné` : "J'ai gagné"}`)
    };
    const addSigns = (embed: EmbedBuilder, { one, two }: { one: shifumiSign; two: shifumiSign }) => {
        embed.addFields(
            {
                name: nickname((interaction?.member as GuildMember) ?? interaction.user),
                value: one.emoji,
                inline: true
            },
            {
                name: 'VS',
                value: ':zap:',
                inline: true
            },
            {
                name: nickname(
                    user
                        ? (options.getMember('adversaire') as GuildMember)
                        : interaction.guild?.members?.me ?? interaction.client.user
                ),
                value: two.emoji,
                inline: true
            }
        );
        return embed;
    };
    if (!user) {
        const choiceMsg = (await interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Signe')
                        .setDescription(`Choisissez votre signe pour m'affronter dans un duel de shifumi sans pitié`)
                        .setColor('Grey')
                ],
                fetchReply: true,
                components: [signs]
            })
            .catch(() => {})) as Message<true>;
        if (!choiceMsg) return;

        const choice = await waitForInteraction({
            componentType: ComponentType.Button,
            user: interaction.user,
            message: choiceMsg
        }).catch(() => {});

        if (!choice)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: []
                })
                .catch(() => {});

        const sign = shifumiSigns[choice.customId];
        const bot = shifumiSigns[Object.keys(shifumiSigns)[random({ max: 3 })]];

        const embed = embeds[compareSigns(sign, bot)];
        addSigns(embed, { one: sign, two: bot });

        interaction
            .editReply({
                embeds: [embed],
                components: []
            })
            .catch(() => {});
    } else {
        if (user.bot)
            return interaction
                .reply({
                    embeds: [
                        replies.memberBot(interaction.user, { member: options.getMember('adversaire') as GuildMember })
                    ],
                    ephemeral: true
                })
                .catch(() => {});

        const msg = (await interaction
            .reply({
                content: pingUser(user),
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Défi')
                        .setDescription(
                            `${interaction.user} vous défie dans un duel de shifumi.\nAcceptez-vous de relever le défi ?`
                        )
                        .setColor('Grey')
                ],
                fetchReply: true,
                components: [yesNoRow()]
            })
            .catch(() => {})) as Message<true>;
        if (!msg) return;

        const yesNoRep = await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            user: user,
            replies: {
                everyone: {
                    embeds: [replies.replyNotAllowed(interaction.user)],
                    ephemeral: true
                }
            }
        }).catch(() => {});

        if (!yesNoRep)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: [],
                    makeContent() {
                        return undefined;
                    }
                })
                .catch(() => {});
        if (yesNoRep.customId === 'no')
            return interaction
                .editReply({
                    components: [],
                    embeds: [replies.cancel()],
                    makeContent() {
                        return undefined;
                    }
                })
                .catch(() => {});

        await yesNoRep.deferUpdate();
        await interaction
            .editReply({
                content: pingUser(interaction.user),
                embeds: [
                    basicEmbed(interaction.user)
                        .setTitle('Signe')
                        .setDescription(`Quel est votre signe ?`)
                        .setColor('Grey')
                ],
                components: [signs]
            })
            .catch(() => {});

        const userSignID = await waitForInteraction({
            componentType: ComponentType.Button,
            message: msg,
            replies: waitForReplies(interaction.client),
            user: interaction.user,
            whoCanReact: 'useronly'
        }).catch(() => {});

        if (!userSignID)
            return interaction
                .editReply({
                    embeds: [replies.cancel()],
                    components: [],
                    makeContent() {
                        return undefined;
                    }
                })
                .catch(() => {});

        await userSignID.deferUpdate();
        await interaction
            .editReply({
                content: pingUser(user)
            })
            .catch(() => {});
        const twoSign = await waitForInteraction({
            componentType: ComponentType.Button,
            user,
            message: msg,
            replies: waitForReplies(interaction.client)
        }).catch(() => {});

        if (!twoSign)
            return interaction.editReply({
                embeds: [replies.cancel()],
                components: [],
                makeContent() {
                    return undefined;
                }
            });

        const userSign = shifumiSigns[userSignID.customId];
        const secondUserSign = shifumiSigns[twoSign.customId];

        const res = compareSigns(userSign, secondUserSign);

        interaction
            .editReply({
                embeds: [addSigns(embeds[res], { one: userSign, two: secondUserSign })],
                makeContent() {
                    return undefined;
                },
                components: []
            })
            .catch(() => {});
    }
});
