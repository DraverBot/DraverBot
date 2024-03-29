import { modulesManager } from '../../cache/managers';
import { DraverCommand } from '../../structures/DraverCommand';
import { log4js, preconditions } from 'amethystjs';
import {
    ApplicationCommandOptionType,
    ApplicationCommandSubCommandData,
    ApplicationCommandSubGroupData,
    ComponentType,
    GuildMember,
    Message,
    StringSelectMenuBuilder
} from 'discord.js';
import { modulesData } from '../../data/modulesData';
import replies from '../../data/replies';
import moduleEnabled from '../../preconditions/moduleEnabled';
import { moduleType } from '../../typings/database';
import { permType } from '../../typings/functions';
import { getRolePerm, moduleName, util } from '../../utils/functions';
import { basicEmbed, boolEmoji, buildButton, capitalize, checkCtx, inviteLink, row } from '../../utils/toolbox';
import { moduleEnabled as moduleEnabledButton } from '../../data/buttons';

export default new DraverCommand({
    name: 'help',
    module: 'utils',
    description: "Affiche la page d'aide des commandes",
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'commande',
            description: 'Commande que vous voulez voir',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    const commands = interaction.client.chatInputCommands as DraverCommand[];

    const command = options.getString('commande');
    if (command) {
        const cmd = commands.find((x) => x.options.name === command);

        const cmdOptions = () => {
            if (cmd.options.options?.length < 1) return "Pas d'options";
            const opts =
                cmd.options?.options
                    ?.filter(
                        (x) =>
                            !['Subcommand', 'SubcommandGroup']
                                .map((y) => ApplicationCommandOptionType[y])
                                .includes(x.type)
                    )
                    ?.map(
                        (opt) =>
                            `${opt.name} - **${
                                (opt as { required?: boolean })?.required === true
                                    ? 'requis'
                                    : (opt as { required?: boolean })?.required === false
                                    ? 'optionnel'
                                    : opt
                                    ? 'sous-commande'
                                    : 'sous-commande'
                            }**`
                    )
                    ?.join('\n') ?? '';
            if (opts?.length === 0) return "Pas d'option";

            return opts;
        };
        const buildSubcommandsSelector = (subcommandGroup?: string) => {
            const subcommands = cmd.options.options?.filter((x) => x.type === ApplicationCommandOptionType.Subcommand);

            if (subcommandGroup) {
                subcommands.splice(0);
                (
                    cmd.options.options.find((x) => x.name === subcommandGroup) as ApplicationCommandSubCommandData
                ).options.forEach((opt) => subcommands.push(opt));
            }

            const selector = new StringSelectMenuBuilder()
                .setCustomId('helpSubCmds')
                .setPlaceholder('Choisissez une sous-commande')
                .setOptions(
                    subcommands.map((x) => ({
                        label: capitalize(x.name),
                        value: x.name,
                        description: `Affiche la sous commande ${x.name}`
                    }))
                );

            return selector;
        };
        const buildSubcommandGroupsSelector = () => {
            const subs = cmd.options.options.filter((x) => x.type === ApplicationCommandOptionType.SubcommandGroup);

            return new StringSelectMenuBuilder()
                .setCustomId('helpSubGrpCmds')
                .setPlaceholder('Choisissez un groupe de sous-commandes')
                .setOptions(
                    subs.map((x) => ({
                        label: capitalize(x.name),
                        description: `Groupe de sous commandes ${x.name}`,
                        value: x.name
                    }))
                );
        };
        let onMenu = true;
        const components = (subcommandGroup?: string) => {
            if ((cmd.options.options?.length ?? 0) === 0) return [];
            if (buildSubcommandsSelector(subcommandGroup).options.length === 0) return [];
            const selects: StringSelectMenuBuilder[] = [];
            if (cmd.options.options.filter((x) => x.type === ApplicationCommandOptionType.SubcommandGroup).length > 0)
                selects.push(buildSubcommandGroupsSelector());

            selects.push(buildSubcommandsSelector(subcommandGroup));

            return [
                ...selects.map((x) => row<StringSelectMenuBuilder>(x)),
                row(
                    buildButton({
                        label: 'Menu',
                        style: 'Secondary',
                        id: 'home',
                        disabled: onMenu
                    })
                )
            ];
        };

        const reply = (await interaction.reply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(`Commande ${cmd.options.name}`)
                    .setDescription(`${cmd.options.description}`)
                    .setFields(
                        {
                            name: 'Cooldown',
                            value: `${cmd.options.cooldown ?? interaction.client.configs.defaultCooldownTime} secondes`,
                            inline: true
                        },
                        {
                            name: 'Utilisable en messages privés',
                            value: boolEmoji(!cmd.options.preconditions.includes(preconditions.GuildOnly)),
                            inline: true
                        },
                        {
                            name: 'Permissions',
                            value:
                                cmd.options.permissions
                                    ?.map((perm) => getRolePerm(perm as permType<'role'>))
                                    .join(' ') ?? 'Pas de permissions',
                            inline: false
                        },
                        {
                            name: 'Module',
                            value: moduleName(cmd.module as moduleType, true),
                            inline: true
                        },
                        {
                            name: 'Options',
                            value: cmdOptions(),
                            inline: true
                        }
                    )
            ],
            components: components(),
            fetchReply: true
        })) as Message<true>;

        const collector = reply.createMessageComponentCollector({
            time: 180000,
            componentType: ComponentType.StringSelect
        });
        const btnCollector = reply.createMessageComponentCollector({
            time: 180000,
            componentType: ComponentType.Button
        });
        btnCollector.on('collect', (ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;
            ctx.deferUpdate();

            onMenu = true;
            interaction.editReply({
                embeds: [
                    basicEmbed(interaction.user, { draverColor: true })
                        .setTitle(`Commande ${cmd.options.name}`)
                        .setDescription(`${cmd.options.description}`)
                        .setFields(
                            {
                                name: 'Cooldown',
                                value: `${
                                    cmd.options.cooldown ?? interaction.client.configs.defaultCooldownTime
                                } secondes`,
                                inline: true
                            },
                            {
                                name: 'Utilisable en messages privés',
                                value: boolEmoji(!cmd.options.preconditions.includes(preconditions.GuildOnly)),
                                inline: true
                            },
                            {
                                name: 'Permissions',
                                value:
                                    cmd.options.permissions
                                        ?.map((perm) => getRolePerm(perm as permType<'role'>))
                                        .join(' ') ?? 'Pas de permissions',
                                inline: false
                            },
                            {
                                name: 'Module',
                                value: modulesData[cmd.module as moduleType]?.name ?? 'N/A',
                                inline: true
                            }
                        )
                ],
                components: components()
            });
        });

        collector.on('collect', async (ctx) => {
            if (!checkCtx(ctx, interaction.user)) return;

            onMenu = false;
            ctx.deferUpdate();

            const value = ctx.values[0];
            const data =
                cmd.options.options.find((x) => x.name === value) ||
                cmd.options.options
                    .filter((x) => x.type === ApplicationCommandOptionType.SubcommandGroup)
                    .map((x: ApplicationCommandSubGroupData) => x)
                    .map((x) => x.options)
                    .flat()
                    .find((x) => x.name === value);
            const group = data.type === ApplicationCommandOptionType.SubcommandGroup;

            interaction
                .editReply({
                    embeds: [
                        basicEmbed(interaction.user, { draverColor: true })
                            .setTitle(`${group ? 'Sous-commande' : 'Commande'} ${data.name}`)
                            .setDescription(
                                `${data.description}\n\nOptions :\n${
                                    (data as ApplicationCommandSubCommandData)?.options
                                        ?.map(
                                            (x) =>
                                                `${x.name} - **${
                                                    x.required === true
                                                        ? 'requis'
                                                        : x.required === false
                                                        ? 'optionnel'
                                                        : 'sous-commande'
                                                }**`
                                        )
                                        ?.join('\n') ?? "Pas d'options"
                                }`
                            )
                    ],
                    components: components(group ? data.name : undefined)
                })
                .catch(() => {});
        });

        collector.on('end', () => {
            interaction.editReply({
                embeds: [replies.cancel()],
                components: []
            });
        });
        return;
    }
    const selector = new StringSelectMenuBuilder()
        .setCustomId('helpSelector')
        .setOptions(
            Object.keys(modulesData).map((k: moduleType) => ({
                label: capitalize(modulesData[k].name),
                description: `Affiche les commandes du module ${modulesData[k].name}`,
                value: k,
                emoji: modulesData[k].emoji
            }))
        )
        .setMaxValues(1)
        .setMinValues(1);
    selector.addOptions({
        label: 'Fermer',
        description: 'Fermer le menu',
        emoji: '❌',
        value: 'close'
    });

    const msg = (await interaction
        .reply({
            fetchReply: true,
            components: [row<StringSelectMenuBuilder>(selector)],
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setDescription(
                        "Bienvenue sur ma page d'aide.\nSélectionnez un module pour consulter les commandes de celui-ci"
                    )
                    .setTitle("Page d'aide")
                    .setThumbnail(interaction.client.user.displayAvatarURL({ forceStatic: true }))
                    .setFields(
                        {
                            name: 'Liens',
                            value: `[Invitation](${inviteLink(interaction.client)})\n[Serveur de support](${util(
                                'support'
                            )})\n[Instagram](${util('instagram')})`,
                            inline: true
                        },
                        {
                            name: 'Projets associés',
                            value: `[Lofi Girl](${util('lofiGirl')})\n[Bender Protect](${util(
                                'benderProtect'
                            )})\n[Audioli](${util('audioli')})`,
                            inline: true
                        },
                        {
                            name: 'Email',
                            value: util('email'),
                            inline: false
                        }
                    )
            ]
        })
        .catch(() => {})) as Message<true>;

    if (!msg) return;
    const collector = msg.createMessageComponentCollector({
        time: 180000,
        componentType: ComponentType.StringSelect
    });
    const buttonCollector = msg.createMessageComponentCollector({
        time: 180000,
        componentType: ComponentType.Button
    });

    buttonCollector.on('collect', (ctx) => {
        if (!ctx.isButton()) return;
        if (ctx.user.id != interaction.user.id) {
            ctx.reply({
                embeds: [replies.cancel()],
                ephemeral: true
            }).catch(log4js.trace);
            return;
        }
        if (!(ctx.member as GuildMember).permissions.has('Administrator')) {
            ctx.reply({
                embeds: [replies.userMissingPermissions(ctx.user, { permissions: { missing: ['Administrator'] } })],
                ephemeral: true
            }).catch(log4js.trace);
            return;
        }

        const mod = modulesData[ctx.customId as moduleType];
        const state = modulesManager.enabled(interaction.guild.id, mod.id);

        modulesManager.setState({
            guild_id: interaction.guild.id,
            module: mod.id,
            state: !state
        });

        ctx.deferUpdate().catch(log4js.trace);
        interaction.editReply({
            components: [row<StringSelectMenuBuilder>(selector), row(moduleEnabledButton(!state, mod.id))]
        });
    });

    collector.on('collect', (ctx) => {
        if (!ctx.isStringSelectMenu) return;
        if (ctx.user.id !== interaction.user.id) {
            ctx.reply({
                embeds: [replies.replyNotAllowed((ctx?.member as GuildMember) ?? ctx.user)],
                ephemeral: true
            }).catch(() => {});
            return;
        }

        if (ctx.values[0] === 'close') {
            interaction
                .editReply({
                    components: [],
                    embeds: [replies.cancel()]
                })
                .catch(() => {});
            collector.stop();
            return;
        }

        const mod = modulesData[ctx.values[0] as moduleType];
        ctx.deferUpdate();

        interaction.editReply({
            embeds: [
                basicEmbed(interaction.user, { draverColor: true })
                    .setTitle(`Module ${mod.name}`)
                    .setDescription(
                        `Voici les commandes du module ${mod.name} :\n${commands
                            .filter((x) => x.module === (ctx.values[0] as moduleType))
                            .map((x) => `\`/${x.options.name}\` : ${x.options.description}`)
                            .join('\n')}`
                    )
            ],
            components: [
                row<StringSelectMenuBuilder>(selector),
                row(
                    moduleEnabledButton(
                        modulesManager.enabled(interaction.guild.id, ctx.values[0] as moduleType),
                        ctx.values[0]
                    )
                )
            ]
        });
    });
    collector.on('end', () => {
        buttonCollector.stop();
    });
});
