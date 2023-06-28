import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    CommandInteraction,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    TextChannel
} from 'discord.js';
import { Process } from '../structures/Process';
import { roleReactButtonType, roleReactType } from '../typings/rolereact';
import { log4js, waitForInteraction, waitForMessage } from 'amethystjs';
import { basicEmbed, buildButton, pingRole, resizeString, row } from '../utils/toolbox';
import GetValidRole from './GetValidRole';
import { yesNoRow } from '../data/buttons';
import GetEmoji from './GetEmoji';

export default new Process(
    'roles react add button',
    ({
        interaction,
        ctx: context,
        roles,
        message,
        componentGenerator
    }: {
        interaction: CommandInteraction;
        ctx: ButtonInteraction;
        roles: roleReactButtonType[];
        message: Message<true>;
        embedGenerator: () => EmbedBuilder;
        componentGenerator: (disabled?: boolean) => ActionRowBuilder<ButtonBuilder>[];
    }) => {
        return new Promise<'finish'>(async (resolve) => {
            message.edit({ components: componentGenerator(true) }).catch(log4js.trace);

            const typeComponents = () => {
                const calculateMax = () => {
                    const totalBtns = roles.filter((x) => x.type === 'buttons').length;
                    const totalMenus = roles.filter((x) => x.type === 'selectmenu').length;

                    const btnRows = Math.ceil(totalBtns / 5);
                    const menuRows = Math.ceil(totalMenus / 25);

                    return {
                        btns: btnRows === 0 ? 1 : btnRows * 5,
                        menus: menuRows === 0 ? 1 : menuRows * 25
                    };
                };
                return [
                    row(
                        buildButton({
                            label: 'Bouton',
                            style: 'Primary',
                            id: 'rolereact.btn',
                            disabled: roles.filter((x) => x.type === 'buttons').length === calculateMax().btns
                        }),
                        buildButton({
                            label: 'Menu',
                            style: 'Primary',
                            id: 'rolereact.menu',
                            disabled: roles.filter((x) => x.type === 'selectmenu').length === calculateMax().menus
                        })
                    )
                ];
            };
            const messageCtx = (await context
                .reply({
                    embeds: [
                        basicEmbed(context.user, { questionMark: true })
                            .setTitle('Type')
                            .setDescription(`Quel est le type de rôle que vous voulez ajouter ?`)
                    ],
                    components: typeComponents(),
                    ephemeral: true,
                    fetchReply: true
                })
                .catch(log4js.trace)) as Message<true>;
            if (!messageCtx) return resolve('finish');

            const typeRes = await waitForInteraction({
                componentType: ComponentType.Button,
                user: context.user,
                message: messageCtx
            }).catch(log4js.trace);

            if (!typeRes) {
                messageCtx.delete().catch(log4js.trace);
                return resolve('finish');
            }
            const roleType: roleReactType = typeRes.customId === 'rolereact.btn' ? 'buttons' : 'selectmenu';
            typeRes.deferUpdate().catch(log4js.trace);

            await context
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Nom')
                            .setDescription(`Quel nom voulez-vous afficher ?\nRépondez dans le chat`)
                    ],
                    components: []
                })
                .catch(log4js.trace);

            const nameRep = await waitForMessage({
                channel: message.channel as TextChannel,
                user: interaction.user,
                time: 120000,
                whoCanReply: 'useronly'
            }).catch(log4js.trace);
            if (!nameRep || !nameRep.content) return resolve('finish');
            nameRep.delete().catch(log4js.trace);

            await context
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Rôle')
                            .setDescription(
                                `Quel rôle voulez-vous assigner ?\nRépondez dans le chat par un nom, un identifiant ou une mention`
                            )
                    ],
                    components: []
                })
                .catch(log4js.trace);
            const role = await GetValidRole.process({
                message,
                user: interaction.user,
                allowCancel: false,
                checks: [
                    {
                        check: (r) => !roles.find((x) => x.role_id === r.id),
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Rôle déjà ajouté')
                                    .setDescription(`Ce rôle a déjà été ajouté en rôle à réaction`)
                            ]
                        }
                    },
                    {
                        check: (r) => r.position < (interaction.member as GuildMember).roles.highest.position,
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Rôle trop haut')
                                    .setDescription(`Ce rôle est supérieur ou égal à vous dans la hiérarchie des rôles`)
                            ]
                        }
                    },
                    {
                        check: (r) => r.position < interaction.guild.members.me.roles.highest.position,
                        reply: {
                            embeds: [
                                basicEmbed(interaction.user, { evoker: interaction.guild })
                                    .setTitle('Rôle trop haut')
                                    .setDescription(`Ce rôle est supérieur ou égal à moi dans la hiérarchie des rôles`)
                            ]
                        }
                    }
                ]
            });
            if (role === "time's up" || role === 'cancel') return 'finish';

            await context
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Emoji')
                            .setDescription(
                                `Le rôle ${pingRole(role)} sera attribué.\nVoulez-vous ajouter un émoji au rôle ?`
                            )
                    ],
                    components: [yesNoRow()]
                })
                .catch(log4js.trace);
            const emojiQuestionRes = await waitForInteraction({
                componentType: ComponentType.Button,
                message: messageCtx,
                user: interaction.user
            }).catch(log4js.trace);

            if (!emojiQuestionRes || emojiQuestionRes.customId === 'no') {
                if (emojiQuestionRes) emojiQuestionRes.deferUpdate().catch(log4js.trace);
                roles.push({
                    emoji: '',
                    role_id: role.id,
                    type: roleType,
                    name: resizeString({ str: nameRep.content, length: 80 })
                });
                return resolve('finish');
            }
            await context
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { questionMark: true })
                            .setTitle('Émoji')
                            .setDescription(`Quel émoji voulez-vous ajouter ?\nRépondez dans le chat`)
                    ],
                    components: []
                })
                .catch(log4js.trace);

            const emoji = await GetEmoji.process({
                user: interaction.user,
                channel: message.channel as TextChannel,
                allowCancel: false
            });

            if (emoji === "time'up" || emoji === 'cancel') {
                roles.push({
                    role_id: role.id,
                    type: roleType,
                    name: resizeString({ str: nameRep.content, length: 80 }),
                    emoji: ''
                });
                return resolve('finish');
            }
            roles.push({
                role_id: role.id,
                type: roleType,
                name: resizeString({ str: nameRep.content, length: 80 }),
                emoji
            });
            return resolve('finish');
        });
    }
);
