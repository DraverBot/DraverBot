import { AmethystEvent, commandDeniedCode } from 'amethystjs';
import { EmbedBuilder, User } from 'discord.js';
import replies, { replyKey } from '../data/replies';
import { systemReply } from '../utils/toolbox';

export default new AmethystEvent('commandDenied', (command, reason) => {
    if (!command?.interaction) return;
    if (reason.metadata?.silent === true) return;

    const integrated: { key: commandDeniedCode; value: replyKey }[] = [
        { key: commandDeniedCode.GuildOnly, value: 'guildOnly' },
        { key: commandDeniedCode.DMOnly, value: 'DMOnly' },
        { key: commandDeniedCode.UserMissingPerms, value: 'userMissingPermissions' },
        { key: commandDeniedCode.ClientMissingPerms, value: 'clientMissingPermissions' },
        { key: commandDeniedCode.UnderCooldown, value: 'underCooldown' }
    ];

    const integration = integrated.find((x) => x.key === reason?.code);

    if (!reason.metadata?.guild && command.interaction?.guild) reason.metadata.guild = command.interaction.guild;

    if (integration) {
        systemReply(command.interaction, {
            embeds: [
                (replies[integration.value] as (user: User, metadata: any) => EmbedBuilder)(
                    command.interaction.user,
                    reason.metadata
                )
            ],
            ephemeral: true
        }).catch(() => {});
        return;
    }

    const reply = replies[reason.metadata?.replyKey](command.interaction?.user, reason.metadata ?? {});
    systemReply(command.interaction, {
        embeds: [reply],
        ephemeral: true
    }).catch(() => {});
});
