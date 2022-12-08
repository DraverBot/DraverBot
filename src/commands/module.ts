import { AmethystCommand, preconditions } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import { moduleType } from '../typings/database';
import { moduleName as ModuleName } from '../utils/functions';
import { basicEmbed, boolEmoji } from '../utils/toolbox';

export default new AmethystCommand({
    name: 'module',
    description: 'Affiche et configure les modules du serveur',
    options: [
        {
            name: 'configurer',
            description: 'Configure un module du serveur',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'module',
                    description: 'Module à configurer',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'état',
                    description: 'État du module',
                    required: true,
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        },
        {
            name: 'afficher',
            description: "Affiche l'état des modules du serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'module',
                    description: 'Module à afficher',
                    required: false,
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly]
}).setChatInputRun(async ({ interaction, options }) => {
    const subcommand = options.getSubcommand();

    if (subcommand === 'configurer') {
        const moduleName = options.getString('module') as moduleType;
        const state = options.getBoolean('état');

        await interaction.deferReply();
        await interaction.client.modulesManager.setState({
            guild_id: interaction.guild.id,
            module: moduleName,
            state
        });

        interaction
            .editReply({
                content: `Le module ${ModuleName(moduleName, true)} a été **${state ? 'activé' : 'désactivé'}**`
            })
            .catch(() => {});
    }
    if (subcommand === 'afficher') {
        const moduleName = options.getString('module') as moduleType | undefined;
        const modules = interaction.client.modulesManager.getServerDatas(interaction.guild.id);
        const em = basicEmbed(interaction.user)
            .setColor(interaction.guild.members.me.displayHexColor)
            .setTitle('Modules');

        if (!moduleName) {
            em.setDescription(`Voici l'état des modules du serveur`).setFields(
                Object.keys(modules)
                    .filter((x) => !x.includes('_'))
                    .map((m: moduleType, index) => {
                        return {
                            name: ModuleName(m, true),
                            value: boolEmoji(modules[m]),
                            inline: index % 3 === 0 ? false : true
                        };
                    })
            );
        } else {
            em.setTitle(`Module ${ModuleName(moduleName)}`).setDescription(
                `Le module ${ModuleName(moduleName)} est **${modules[moduleName] ? 'activé' : 'désactivé'}** sur ${
                    interaction.guild.name
                }`
            );
        }

        interaction
            .reply({
                embeds: [em]
            })
            .catch(() => {});
    }
});
