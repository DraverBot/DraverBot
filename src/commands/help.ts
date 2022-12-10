import { AmethystCommand, preconditions } from "amethystjs";
import { ApplicationCommandOptionType, ComponentType, GuildMember, Message, StringSelectMenuBuilder } from "discord.js";
import { modulesData } from "../data/modulesData";
import replies from "../data/replies";
import moduleEnabled from "../preconditions/moduleEnabled";
import { moduleType } from "../typings/database";
import { commandName, permType } from "../typings/functions";
import { getPerm, Module } from "../utils/functions";
import { basicEmbed, boolEmoji, capitalize, row } from "../utils/toolbox";
import { moduleEnabled as moduleEnabledButton } from '../data/buttons';

export default new AmethystCommand({
    name: 'help',
    description: "Affiche la page d'aide des commandes",
    preconditions: [moduleEnabled],
    options: [
        {
            name: 'commande',
            description: "Commande que vous voulez voir",
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        }
    ]
}).setChatInputRun(async({ interaction, options }) => {
    const commands: (AmethystCommand & { module: moduleType })[] = interaction.client.chatInputCommands.map((x) => (Object.assign(x, { module: Module(x.options.name as commandName) })));

    const command = options.getString('commande');
    if (command) {
        const cmd = commands.find(x => x.options.name === command) as AmethystCommand & { module: moduleType };
        const subs = cmd.options.options.filter(x => x.type === ApplicationCommandOptionType.Subcommand || x.type === ApplicationCommandOptionType.SubcommandGroup);

        return interaction.reply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle(`Commande ${cmd.options.name}`)
                .setDescription(`${cmd.options.description}`)
                .setFields(
                    {
                        name: "Cooldown",
                        value: `${cmd.options.cooldown ?? interaction.client.configs.defaultCooldownTime} secondes`,
                        inline: true
                    },
                    {
                        name: "Utilisable en messages privés",
                        value: boolEmoji(!cmd.options.preconditions.includes(preconditions.GuildOnly)),
                        inline: true
                    },
                    {
                        name: "Permissions",
                        value: cmd.options.permissions?.map(perm => getPerm(perm as permType)).join(' ') ?? 'Pas de permissions',
                        inline: false
                    },
                    {
                        name: 'Sous-commandes',
                        value: subs.length === 0 ? "Pas de sous-commandes" : subs.map(x => x.name).join(', '),
                        inline: true
                    },
                    {
                        name: 'Module',
                        value: Module(cmd.options.name as commandName),
                        inline: true
                    }
                )
            ]
        })
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
        .setMinValues(1)
    selector.addOptions({
        label: 'Fermer',
        description: "Fermer le menu",
        emoji: '❌',
        value: 'close'
    })

    const msg = await interaction.reply({
        fetchReply: true,
        components: [ row<StringSelectMenuBuilder>(selector) ],
        embeds: [ basicEmbed(interaction.user, { defaultColor: true })
            .setDescription("Bienvenue sur ma page d'aide.\nSélectionnez un module pour consulter les commandes de celui-ci")
            .setTitle("Page d'aide")
            .setThumbnail(interaction.client.user.displayAvatarURL({ forceStatic: true }))
        ]
    }).catch(() => {}) as Message<true>;

    if (!msg) return;
    const collector = msg.createMessageComponentCollector({
        time: 180000,
        componentType: ComponentType.StringSelect
    });

    collector.on('collect', (ctx) => {
        if (ctx.user.id !== interaction.user.id) {
            ctx.reply({
                embeds: [ replies.replyNotAllowed(ctx?.member as GuildMember ?? ctx.user) ],
                ephemeral: true
            }).catch(() => {});
            return;
        }

        if (ctx.values[0] === 'close') {
            interaction.editReply({
                components: [],
                embeds: [ replies.cancel() ]
            }).catch(() => {});
            return;
        }

        const mod = modulesData[ctx.values[0] as moduleType]
        ctx.deferUpdate();

        interaction.editReply({
            embeds: [ basicEmbed(interaction.user, { defaultColor: true })
                .setTitle(`Module ${mod.name}`)
                .setDescription(`Voici les commandes du module ${mod.name} :\n${commands.filter(x => x.module === ctx.values[0] as moduleType).map(x => `\`/${x.options.name}\` : ${x.options.description}`).join('\n')}`)
            ],
            components: [ row<StringSelectMenuBuilder>(selector), row(moduleEnabledButton(interaction.client.modulesManager.enabled(interaction.guild.id, ctx.values[0] as moduleType))) ]
        })
    })
})