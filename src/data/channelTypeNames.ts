import { ChannelType } from 'discord.js';

export const channelTypeNames: Record<keyof typeof ChannelType, string> = {
    AnnouncementThread: "d'annonces",
    DM: 'messages privés',
    GuildAnnouncement: "d'annonces",
    GuildCategory: 'catégorie',
    GroupDM: 'groupe de messages privés',
    GuildForum: 'forum',
    GuildNews: 'annonces',
    GuildDirectory: 'dossier',
    GuildNewsThread: "fil d'annonces",
    GuildPrivateThread: 'fil privé',
    GuildPublicThread: 'fil public',
    GuildStageVoice: 'conférences',
    GuildText: 'textuel',
    GuildVoice: 'vocal',
    PrivateThread: 'fil privé',
    PublicThread: 'fil public',
    GuildMedia: 'Fichiers de serveur'
};
