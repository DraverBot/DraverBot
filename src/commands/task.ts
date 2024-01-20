import { configsManager, tasksManager } from '../cache/managers';
import { DraverCommand } from '../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import moduleEnabled from '../preconditions/moduleEnabled';
import { ApplicationCommandOptionType, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import time from '../preconditions/time';
import {
    basicEmbed,
    confirm,
    displayDate,
    getMsgUrl,
    notNull,
    numerize,
    pagination,
    pingChan,
    pingUser,
    plurial,
    resizeString,
    systemReply
} from '../utils/toolbox';
import ms from 'ms';
import replies from '../data/replies';
import { Task } from '../structures/Task';
import { taskState } from '../typings/database';
import { color } from '../utils/functions';

export default new DraverCommand({
    name: 'tache',
    module: 'administration',
    description: 'Gère les tâches sur le serveur',
    preconditions: [preconditions.GuildOnly, moduleEnabled, time],
    permissions: ['ManageGuild'],
    options: [
        {
            name: 'liste',
            description: 'Affiche la liste des tâches',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'terminées',
                    description: 'Affiche les tâches terminées',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false
                },
                {
                    name: 'travail',
                    description: 'Affiche les tâches en cours de travail',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false
                },
                {
                    name: 'attente',
                    description: 'Affiche les tâches en attente',
                    required: false,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        },
        {
            name: 'analyser',
            description: 'Montre une tâche en particuler',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'tâche',
                    description: 'Tâche que vous voulez voir',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'créer',
            description: 'Créer une tâche',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'nom',
                    description: 'Nom de la tâche',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'description',
                    description: 'Description de la tâche',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'temps',
                    description: 'Limite de temps de la tâche (ex: 1d)',
                    required: false,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'image',
                    description: "Image affichée sur l'embed de la tâche",
                    required: false,
                    type: ApplicationCommandOptionType.Attachment
                }
            ]
        },
        {
            name: 'assigner',
            description: 'Assigne une personne à une tâche',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'tâche',
                    description: "Tâche à laquelle vous voulez assigner quelqu'un",
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'utilisateur',
                    description: 'Utilisateur que vous voulez assigner',
                    required: false,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'notification',
                    description: "Envoie une notification à l'utilisateur",
                    required: false,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        },
        {
            name: 'destituer',
            description: "Enlève l'assignation d'un utilisateur à une tâche",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'tâche',
                    description: 'Tâche à laquelle vous voulez enlever un utilisateur',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'utilisateur',
                    description: 'Utilisateur que vous voulez enlever',
                    required: false,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'notification',
                    description: 'Envoie une notification à la personne',
                    required: false,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        },
        {
            name: 'fermer',
            description: 'Ferme une tâche',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'tâche',
                    required: true,
                    description: 'Tâche que vous voulez fermer',
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        },
        {
            name: 'terminer',
            description: 'Marque une tâche comme terminée',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'tâche',
                    description: 'Tâche que vous voulez terminer',
                    required: true,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    if (!configsManager.getValue(interaction.guild.id, 'task_enable'))
        return interaction
            .reply({
                embeds: [
                    basicEmbed(interaction.user, { evoker: interaction.guild })
                        .setTitle('Tâches désactivées')
                        .setDescription(
                            `Les tâches sont désactivées sur ${interaction.guild.name}.\nActivez-les avec la commande \`/configurer\``
                        )
                ],
                ephemeral: true
            })
            .catch(log4js.trace);

    const cmd = options.getSubcommand();
    if (cmd === 'créer') {
        const name = options.getString('nom');
        const description = options.getString('description');
        const time = ms(options.getString('temps') ?? 'invalid');
        const img = options.getAttachment('image');

        if (img && !img.contentType.includes('image'))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Image invalide')
                            .setDescription(`Veuillez envoyer une image valide`)
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        const channelId = configsManager.getValue<string>(interaction.guild.id, 'task_channel');

        if (!channelId || channelId === '')
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Salon non configuré')
                            .setDescription(
                                `Le salon des tâches n'est pas configuré.\nUtilisez la commande \`/configurer\` pour le configurer`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        await interaction
            .reply({
                embeds: [replies.wait(interaction.user)]
            })
            .catch(log4js.trace);
        const channel = await interaction.guild.channels.fetch(channelId).catch(log4js.trace);

        if (!channel)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Salon non configuré')
                            .setDescription(
                                `Le salon des tâches n'est pas configuré.\nUtilisez la commande \`/configurer\` pour le configurer`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const res = await tasksManager
            .create({
                name,
                description,
                image: img?.url ?? null,
                time: time ?? 0,
                by: interaction.user,
                channel: channel as TextChannel
            })
            .catch(log4js.trace);
        if (!res || res === 'insertion not found' || res === 'no guild found' || res === 'no message found')
            return interaction
                .editReply({
                    embeds: [replies.internalError(interaction.member as GuildMember)]
                })
                .catch(log4js.trace);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Tâche créée')
                        .setDescription(`La tâche **${name}** a été créée dans ${pingChan(channel)}`)
                ]
            })
            .catch(log4js.trace);
    }
    const getTask = () => {
        return tasksManager.getTask(parseInt(options.getString('tâche')));
    };
    if (cmd === 'fermer') {
        const task = getTask();
        if (!task)
            return interaction
                .reply({
                    embeds: [replies.tasks.unexisting(interaction.member as GuildMember)],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Fermeture')
                .setDescription(`Êtes-vous sûr de fermer la tâche **${task.data.name}** ?`)
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({ embeds: [replies.cancel()], components: [] }).catch(log4js.trace);
        tasksManager.close(task.data.id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Tâche fermée')
                        .setDescription(`La tâche **${task.data.name}** a été fermée`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    if (cmd === 'terminer') {
        const task = getTask();
        if (!task)
            return interaction
                .reply({
                    embeds: [replies.tasks.unexisting(interaction.member as GuildMember)],
                    ephemeral: true
                })
                .catch(log4js.trace);

        const confirmation = await confirm({
            interaction,
            user: interaction.user,
            embed: basicEmbed(interaction.user)
                .setTitle('Terminer')
                .setDescription(`Êtes-vous sûr de fermer marquer la tâche **${task.data.name}** comme terminée ?`)
        }).catch(log4js.trace);

        if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
            return interaction.editReply({ embeds: [replies.cancel()], components: [] }).catch(log4js.trace);
        tasksManager.done(task.data.id);

        interaction
            .editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Tâche terminée')
                        .setDescription(`La tâche **${task.data.name}** a été terminée`)
                ],
                components: []
            })
            .catch(log4js.trace);
    }
    const checkUser = (task: Task) => {
        const member = (options.getMember('utilisateur') ?? interaction.member) as GuildMember;
        if (member.id === interaction.user.id) return true;

        if (task.data.opened_by === interaction.user.id) return true;
        if ((interaction.member as GuildMember).permissions.has('Administrator')) return true;
        if (interaction.user.id === interaction.guild.ownerId) return true;
        if (member.roles.highest.position >= (interaction.member as GuildMember).roles.highest.position) return false;
        return true;
    };

    if (cmd === 'assigner') {
        const user = options.getUser('utilisateur') ?? interaction.user;
        const self = user.id === interaction.user.id;
        const task = getTask();
        const sendNotification = notNull(options.getBoolean('notification'))
            ? options.getBoolean('notification')
            : true;

        if (!task)
            return interaction
                .reply({ embeds: [replies.tasks.unexisting(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);
        if (task.ended)
            return interaction
                .reply({ embeds: [replies.tasks.taskEnded(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);

        if (!checkUser(task))
            return interaction
                .reply({
                    embeds: [
                        replies.memberTooHigh(interaction.user, {
                            member: (options.getMember('utilisateur') ?? interaction.member) as GuildMember
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        if (task.isAssigned(user.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Déjà assigné')
                            .setDescription(
                                self
                                    ? `Vous êtes déjà assigné à la tâche **${task.data.name}**`
                                    : `${pingUser(user)} est déjà assigné à la tâche **${task.data.name}**`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (!self) {
            const confirmation = await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('Assignation')
                    .setDescription(`Êtes-vous sûr d'assigner ${pingUser(user)} à la tâche **${task.data.name}** ?`)
            }).catch(log4js.trace);

            if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
        }

        tasksManager.assign({ userId: user.id, taskId: task.data.id });
        systemReply(interaction, {
            components: [],
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Assignation')
                    .setDescription(`${pingUser(user)} a été assigné à la tâche **${task.data.name}**`)
            ]
        }).catch(log4js.trace);
        if (sendNotification && !self)
            user.send({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle('Assignation à une tâche')
                        .setDescription(
                            `${pingUser(interaction.user)} vous a assigné à la tâche [**${
                                task.data.name
                            }**](${getMsgUrl(task.data)}) sur ${interaction.guild.name}`
                        )
                ]
            }).catch(log4js.trace);
    }
    if (cmd === 'destituer') {
        const user = options.getUser('utilisateur') ?? interaction.user;
        const self = user.id === interaction.user.id;
        const task = getTask();
        const sendNotification = notNull(options.getBoolean('notification'))
            ? options.getBoolean('notification')
            : true;

        if (!task)
            return interaction
                .reply({ embeds: [replies.tasks.unexisting(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);
        if (task.ended)
            return interaction
                .reply({ embeds: [replies.tasks.taskEnded(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);

        if (!checkUser(task))
            return interaction
                .reply({
                    embeds: [
                        replies.memberTooHigh(interaction.user, {
                            member: (options.getMember('utilisateur') ?? interaction.member) as GuildMember
                        })
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);

        if (!task.isAssigned(user.id))
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Non-assigné')
                            .setDescription(
                                self
                                    ? `Vous n'êtes pas assigné à la tâche **${task.data.name}**`
                                    : `${pingUser(user)} n'est pas assigné à la tâche **${task.data.name}**`
                            )
                    ],
                    ephemeral: true
                })
                .catch(log4js.trace);
        if (!self) {
            const confirmation = await confirm({
                interaction,
                user: interaction.user,
                embed: basicEmbed(interaction.user)
                    .setTitle('Destitution')
                    .setDescription(`Êtes-vous sûr de destituer ${pingUser(user)} de la tâche **${task.data.name}** ?`)
            }).catch(log4js.trace);

            if (!confirmation || confirmation === 'cancel' || !confirmation?.value)
                return interaction
                    .editReply({
                        embeds: [replies.cancel()],
                        components: []
                    })
                    .catch(log4js.trace);
        }

        tasksManager.unAssign({ userId: user.id, taskId: task.data.id });
        systemReply(interaction, {
            components: [],
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle('Destitution')
                    .setDescription(`${pingUser(user)} a été destitué de la tâche **${task.data.name}**`)
            ]
        }).catch(log4js.trace);
        if (sendNotification && !self)
            user.send({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle("Destitution d'une tâche")
                        .setDescription(
                            `${pingUser(interaction.user)} vous a destitué de la tâche [**${
                                task.data.name
                            }**](${getMsgUrl(task.data)}) sur ${interaction.guild.name}`
                        )
                ]
            }).catch(log4js.trace);
    }
    if (cmd === 'liste') {
        const getCondition = (condition: string, defaultValue: boolean) => {
            const x = options.getBoolean(condition);
            if (notNull(x)) return x;
            return defaultValue;
        };
        const ended = getCondition('terminées', false);
        const pending = getCondition('attente', true);
        const working = getCondition('travail', true);

        const list = tasksManager.getServer(interaction.guild.id).filter((x) => {
            if (x.ended) return ended;
            if (x.data.state === 'pending') return pending;
            if (x.data.state === 'working') return working;
        });
        if (list.size === 0)
            return interaction
                .reply({
                    embeds: [
                        basicEmbed(interaction.user, { evoker: interaction.guild })
                            .setTitle('Aucune tâche')
                            .setDescription(`Il n'y a aucune tâche sur ${interaction.guild.name}`)
                    ]
                })
                .catch(log4js.trace);
        const criteres = () => {
            const contentArray: string[] = [];
            if (ended) contentArray.push('terminées');
            if (pending) contentArray.push('en attente');
            if (working) contentArray.push('en cours de traitement');

            if (contentArray.length === 0) return 'aucun critère';
            return contentArray.join(', ');
        };
        const embed = () =>
            basicEmbed(interaction.user, { draverColor: true })
                .setTitle('Tâches')
                .setDescription(
                    `Il y a **${numerize(list.size)}** tâches qui correspondent à vos critères (${criteres()})`
                );
        const field = (task: Task, embed: EmbedBuilder) =>
            embed.addFields({
                name: resizeString({ str: task.data.name, length: 256 }),
                value: resizeString({
                    str: task.ended
                        ? `Terminée (${numerize(task.data.assignees.length)} assigné${plurial(task.data.assignees)})\n${
                              task.data.description
                          }`
                        : task.data.state === 'pending'
                        ? `En attente\n${task.data.description}${
                              notNull(task.data.deadline) && task.data.deadline > 0
                                  ? `\nÀ finir avant ${displayDate(task.data.deadline)}`
                                  : ''
                          }`
                        : `En traitement (${numerize(task.data.assignees.length)} assigné${plurial(
                              task.data.assignees
                          )})\n${task.data.description}${
                              notNull(task.data.deadline) && task.data.deadline > 0
                                  ? `\nÀ finir avant ${displayDate(task.data.deadline)}`
                                  : ''
                          }`,
                    length: 1024
                }),
                inline: false
            });

        if (list.size <= 5) {
            const res = embed();
            list.forEach((x) => field(x, res));
            interaction.reply({ embeds: [res] }).catch(log4js.trace);
        } else {
            const embeds = [embed()];

            list.forEach((x, i) => {
                if (i % 5 === 0 && i > 0) embeds.push(embed());

                field(x, embeds[embeds.length - 1]);
            });

            pagination({ interaction, user: interaction.user, embeds });
        }
    }
    if (cmd === 'analyser') {
        const task = getTask();
        if (!task)
            return interaction
                .reply({ embeds: [replies.tasks.unexisting(interaction.member as GuildMember)], ephemeral: true })
                .catch(log4js.trace);

        const embedColor =
            task.data.state === 'closed'
                ? color('taskClosed')
                : task.data.state === 'done'
                ? color('taskDone')
                : task.data.state === 'pending'
                ? color('taskPending')
                : color('taskWorking');

        const states: Record<taskState, string> = {
            closed: 'fermée',
            done: 'terminée',
            working: 'en traitement',
            pending: 'en attente'
        };

        const res = basicEmbed(interaction.user)
            .setColor(embedColor)
            .setDescription(
                resizeString({ length: 4096, str: `Tâche ${states[task.data.state]}\n${task.data.description}` })
            )
            .setTitle(resizeString({ str: task.data.name, length: 256 }));
        if (task.data.state === 'working') {
            res.addFields(
                {
                    name: 'Assignés',
                    value: task.data.assignees.map(pingUser).join(', ') ?? 'Aucun assigné',
                    inline: true
                },
                {
                    name: 'Ouverte par',
                    value: `${pingUser(task.data.opened_by) ?? 'Inconnu'} ${displayDate(task.data.startedAt)}`,
                    inline: true
                }
            );
        }
        if (notNull(task.data.deadline) && task.data.deadline > 0 && !task.ended) {
            res.addFields({
                name: 'À finir avant',
                value: displayDate(task.data.deadline) ?? 'N/A',
                inline: false
            });
        }

        interaction.reply({
            embeds: [res]
        });
    }
});
