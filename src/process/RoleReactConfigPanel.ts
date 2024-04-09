import { log4js } from 'amethystjs';
import { Message, ComponentType, TextChannel, CommandInteraction, ButtonInteraction } from 'discord.js';
import replies from '../data/replies';
import { Process } from '../structures/Process';
import { ButtonIds } from '../typings/buttons';
import { roleReactButtonType } from '../typings/rolereact';
import { basicEmbed, pingChan, pingRole, row, buildButton, confirm } from '../utils/toolbox';
import GetValidRole from './GetValidRole';
import RoleReactAdd from './RoleReactAdd';
import SetRandomComponent from './SetRandomComponent';

export default new Process(
    'role react config panel',
    async ({ interaction, channel }: { channel: TextChannel; interaction: CommandInteraction }) => {
        return new Promise<{ roles: roleReactButtonType[]; button: ButtonInteraction } | 'cancel'>(async (resolve) => {
            const roles: roleReactButtonType[] = [];
            const embed = () => {
                const btnRoles = roles.filter((x) => x.type === 'buttons');
                const menuRoles = roles.filter((x) => x.type === 'selectmenu');
                return basicEmbed(interaction.user, { questionMark: true })
                    .setTitle('Rôles à réaction')
                    .setDescription(
                        `Vous êtes en train de configurer le panneau de rôles à réaction qui sera envoyé dans ${pingChan(
                            channel
                        )}`
                    )
                    .setFields(
                        {
                            name: 'Rôles (bouttons)',
                            value:
                                btnRoles.length === 0
                                    ? 'Pas de rôles'
                                    : btnRoles
                                          .map((x) => `${x.emoji ? x.emoji : ''} ${x.name} ( ${pingRole(x.role_id)} )`)
                                          .join('\n') ?? 'Pas de rôles',
                            inline: true
                        },
                        {
                            name: 'Rôles (menu)',
                            value:
                                menuRoles.length === 0
                                    ? 'Pas de rôles'
                                    : menuRoles
                                          .map((x) => `${x.emoji ? x.emoji : ''} ${x.name} ( ${pingRole(x.role_id)} )`)
                                          .join('\n'),
                            inline: true
                        }
                    );
            };
            const components = (disabled = false) => {
                const calculateIfValid = () => {
                    if (roles.length === 0) return true;
                    const totalBtns = roles.filter((x) => x.type === 'buttons').length;
                    const totalMenus = roles.filter((x) => x.type === 'selectmenu').length;

                    const btnRows = Math.ceil(totalBtns / 5);
                    const menuRows = Math.ceil(totalMenus / 25);

                    const spaceOfButtons = btnRows * 5;
                    const spaceOfMenus = menuRows * 25;
                    const emptyRows = 5 - btnRows - menuRows;
                    const theoricalMaxLength = spaceOfButtons + spaceOfMenus + emptyRows * 5;

                    if (theoricalMaxLength === 0) return true;
                    return totalBtns + totalMenus < theoricalMaxLength;
                };
                return [
                    row(
                        buildButton({
                            label: 'Ajouter un bouton',
                            disabled: !calculateIfValid() || disabled,
                            style: 'Primary',
                            buttonId: 'RoleReactAdd'
                        }),
                        buildButton({
                            label: 'Supprimer un bouton',
                            disabled: roles.length === 0 || disabled,
                            style: 'Secondary',
                            buttonId: 'RoleReactRemove'
                        }),
                        buildButton({
                            label: 'Annuler',
                            style: 'Danger',
                            buttonId: 'RoleReactsCancel',
                            disabled: disabled
                        }),
                        buildButton({
                            label: 'Valider',
                            disabled: roles.length === 0 || disabled,
                            style: 'Success',
                            buttonId: 'RoleReactsOk'
                        })
                    )
                ];
            };

            const getMessage = async () => {
                if (interaction.replied || interaction.deferred) {
                    await interaction
                        .editReply({
                            embeds: [embed()],
                            components: components()
                        })
                        .catch(log4js.trace);
                    return interaction.fetchReply().catch(log4js.trace) as unknown as Message<true>;
                } else {
                    return (await interaction
                        .reply({
                            embeds: [embed()],
                            components: components(),
                            fetchReply: true
                        })
                        .catch(log4js.trace)) as Message<true>;
                }
            };
            const panel = await getMessage();
            if (!panel) return;

            const collector = panel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000
            });
            collector.on('collect', async (ctx) => {
                if (ctx.user.id !== interaction.user.id) {
                    ctx.reply({
                        embeds: [
                            basicEmbed(ctx.user, { evoker: interaction.guild })
                                .setTitle('Interaction refusée')
                                .setDescription(`Vous n'avez pas le droit d'interagir avec cette interaction`)
                        ],
                        ephemeral: true,
                        components: SetRandomComponent.process()
                    }).catch(log4js.trace);
                    return;
                }
                if (ctx.customId === ButtonIds.RoleReactAdd) {
                    await RoleReactAdd.process({
                        interaction,
                        message: panel,
                        ctx,
                        embedGenerator: embed,
                        componentGenerator: components,
                        roles
                    });

                    ctx.deleteReply().catch(log4js.trace);
                    panel
                        .edit({
                            embeds: [embed()],
                            components: components()
                        })
                        .catch(log4js.trace);
                }
                if (ctx.customId === ButtonIds.RoleReactRemove) {
                    panel
                        .edit({
                            components: components(true)
                        })
                        .catch(log4js.trace);
                    const rep = (await ctx
                        .reply({
                            embeds: [
                                basicEmbed(interaction.user, { questionMark: true })
                                    .setTitle('Rôle')
                                    .setDescription(
                                        `Quel rôle voulez-vous retirer ?\nRépondez dans le chat par un **nom**, un **identifiant** ou une **mention**`
                                    )
                            ],
                            fetchReply: true
                        })
                        .catch(log4js.trace)) as Message<true>;
                    if (!rep) {
                        panel.edit({ components: components() }).catch(log4js.trace);
                        return;
                    }

                    const role = await GetValidRole.process({
                        message: rep,
                        user: interaction.user,
                        allowCancel: true,
                        time: 120000,
                        checks: [
                            {
                                check: (r) => !!roles.find((x) => x.role_id === r.id),
                                reply: {
                                    embeds: [
                                        basicEmbed(interaction.user, { evoker: interaction.guild })
                                            .setTitle('Rôle non-ajouté')
                                            .setDescription(`Ce rôle n'a pas été ajouté en réaction`)
                                    ]
                                }
                            }
                        ]
                    });

                    if (role === 'cancel' || role === "time's up") {
                        ctx.deleteReply(rep).catch(log4js.trace);
                        panel.edit({ components: components() }).catch(log4js.trace);
                        return;
                    }

                    const confirmation = await confirm({
                        interaction: ctx,
                        embed: basicEmbed(interaction.user)
                            .setTitle('Retrait')
                            .setDescription(`Êtes-vous sûr de vouloir retirer le rôle ${pingRole(role)} ?`),
                        user: interaction.user
                    }).catch(log4js.trace);
                    ctx.deleteReply().catch(log4js.trace);

                    if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                        panel.edit({ components: components() }).catch(log4js.trace);
                        return;
                    }
                    roles.splice(roles.indexOf(roles.find((x) => x.role_id === role.id)), 1);
                    panel.edit({ components: components(), embeds: [embed()] }).catch(log4js.trace);
                }
                if (ctx.customId === ButtonIds.RoleReactsCancel) {
                    panel.edit({ components: components(true) }).catch(log4js.trace);
                    const confirmation = await confirm({
                        interaction: ctx,
                        user: interaction.user,
                        ephemeral: true,
                        embed: basicEmbed(interaction.user)
                            .setTitle('Annulation')
                            .setDescription(`Êtes-vous sûr de vouloir annuler la création des rôles à réaction ?`)
                    }).catch(log4js.trace);

                    ctx.deleteReply().catch(log4js.trace);
                    if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                        panel.edit({ components: components() }).catch(log4js.trace);
                        return;
                    }
                    panel
                        .edit({
                            components: [],
                            embeds: [replies.cancel(interaction)]
                        })
                        .catch(log4js.trace);
                    collector.stop('cancel');
                    return resolve('cancel');
                }
                if (ctx.customId === ButtonIds.RoleReactsOk) {
                    panel.edit({ components: components(true) }).catch(log4js.trace);
                    const confirmation = await confirm({
                        interaction: ctx,
                        user: interaction.user,
                        ephemeral: true,
                        embed: basicEmbed(interaction.user)
                            .setTitle('Validation')
                            .setDescription(`Êtes-vous sûr de vouloir valider la création des rôles à réaction ?`)
                    }).catch(log4js.trace);

                    if (!confirmation || confirmation === 'cancel' || !confirmation?.value) {
                        ctx.deleteReply().catch(log4js.trace);
                        panel.edit({ components: components() }).catch(log4js.trace);
                        return;
                    }
                    ctx.deleteReply().catch(log4js.trace);

                    collector.stop('ended');
                    return resolve({ roles, button: ctx });
                }
            });

            collector.on('end', (_c, r) => {
                if (r === 'ended' || r === 'cancel') return;
                interaction
                    .editReply({
                        embeds: [replies.cancel(interaction)],
                        components: []
                    })
                    .catch(log4js.trace);
                return resolve('cancel');
            });
        });
    }
);
