import { AmethystEvent, ButtonDeniedCode } from 'amethystjs';
import { EmbedBuilder, User } from 'discord.js';
import replies, { replyKey } from '../data/replies';

export default new AmethystEvent('buttonDenied', ({ button, message, metadata, user }) => {
    if (metadata?.silent === true) return;

    const integrated: { key: ButtonDeniedCode; value: replyKey }[] = [
        { key: ButtonDeniedCode.GuildOnly, value: 'guildOnly' },
        { key: ButtonDeniedCode.DMOnly, value: 'DMOnly' },
        { key: ButtonDeniedCode.MissingPerms, value: 'userMissingPermissions' },
        { key: ButtonDeniedCode.ClientMissingPerms, value: 'clientMissingPermissions' }
    ];

    const integration = integrated.find((x) => x.key === metadata?.code);

    if (!metadata.guild && button.guild) metadata.guild = button.guild;

    if (integration) {
        button
            .reply({
                embeds: [(replies[integration.value] as (user: User, metadata: any) => EmbedBuilder)(user, metadata)],
                ephemeral: true
            })
            .catch(() => {});
        return;
    }

    const reply = replies[metadata?.replyKey](user, metadata ?? {});

    button
        .reply({
            embeds: [reply],
            ephemeral: true
        })
        .catch(() => {});
});
