export type configOptionType = 'string' | 'number' | 'channel' | 'boolean' | 'role' | 'image';
export type configKeys = {
    logs_enable: boolean;
    logs_channel: string;
    level_channel: string;
    level_msg: string;
    join_active: boolean;
    leave_active: boolean;
    join_channel: string;
    leave_channel: string;
    join_message: string;
    leave_message: string;
    suggest_channel: string;
    suggest_enable: boolean;
    join_roles: boolean;
    suggest_thread: boolean;
    gban: boolean;
    gban_ban: boolean;
    mention_message: boolean;
    task_channel: string;
    task_enable: boolean;
    level_rewards: boolean;
    voice_role: string;
    voice_role_enabled: boolean;
    temp_channels: boolean;
    welcome_image: Buffer;
    welcome_image_radius: number;
    leave_image: Buffer;
    leave_image_radius: number;
};
export type configType = {
    description: string;
    name: string;
    type: configOptionType;
    value: keyof configKeys;
    default: string | boolean | number | null;
};

export const configsTypeData: Record<configOptionType, { name: string; description: string }> = {
    boolean: {
        name: 'booléen',
        description: 'État (vrai ou faux)'
    },
    string: {
        name: 'texte',
        description: 'Texte'
    },
    number: {
        name: 'nombre',
        description: 'Nombre'
    },
    channel: {
        name: 'salon',
        description: 'Salon'
    },
    role: {
        name: 'rôle',
        description: 'Rôle du serveur'
    },
    image: {
        name: 'image',
        description: 'Une image'
    }
};
export const configsData: Record<keyof configKeys, configType> = {
    logs_channel: {
        name: 'salon des logs',
        value: 'logs_channel',
        type: 'channel',
        description: 'Configure le salon des logs',
        default: null
    },
    logs_enable: {
        name: 'activation des logs',
        value: 'logs_enable',
        type: 'boolean',
        description: 'Active/désactive les logs',
        default: false
    },
    level_channel: {
        name: 'salon des niveaux',
        value: 'level_channel',
        type: 'channel',
        description: "Salon de l'envoi des messages de niveau",
        default: null
    },
    level_msg: {
        name: 'message de niveau',
        value: 'level_msg',
        type: 'string',
        description: 'Message de niveau',
        default: 'Bien joué {user.mention} ! Tu passes au niveau {user.level}'
    },
    join_active: {
        name: "messages d'arrivée",
        value: 'join_active',
        type: 'boolean',
        description: "Activation de message d'arrivée",
        default: false
    },
    leave_active: {
        name: 'messages de départ',
        value: 'leave_active',
        type: 'boolean',
        description: 'Activation des messages de départ',
        default: false
    },
    join_channel: {
        name: "salon d'arrivée",
        value: 'join_channel',
        type: 'channel',
        description: "Salon des messages d'arrivée",
        default: null
    },
    leave_channel: {
        name: 'salon de départ',
        value: 'leave_channel',
        type: 'channel',
        description: 'Salon des messages de départ',
        default: null
    },
    join_message: {
        name: "message d'arrivée",
        value: 'join_message',
        description: "Message d'arrivée",
        default: `{user.mention} vient d'arriver`,
        type: 'string'
    },
    leave_message: {
        name: 'message de départ',
        value: 'leave_message',
        default: `{user.name} vient de partir`,
        type: 'string',
        description: 'Message de départ'
    },
    suggest_channel: {
        name: 'salon de suggestions',
        value: 'suggest_channel',
        default: null,
        description: 'Salon des suggestions',
        type: 'channel'
    },
    suggest_enable: {
        name: 'suggestions',
        value: 'suggest_enable',
        default: false,
        type: 'boolean',
        description: 'Activation des suggestions'
    },
    join_roles: {
        name: "rôles d'arrivée",
        value: 'join_roles',
        default: false,
        type: 'boolean',
        description: "Activation des rôles d'arrivée"
    },
    suggest_thread: {
        name: 'fil de suggestion',
        value: 'suggest_thread',
        type: 'boolean',
        default: false,
        description: "Création d'un fil pour une nouvelle suggestion"
    },
    gban: {
        name: 'GBan',
        value: 'gban',
        type: 'boolean',
        default: true,
        description: 'Système de GBan'
    },
    gban_ban: {
        name: 'Bannissement si GBan',
        value: 'gban_ban',
        description: `Banni le membre si il est GBanni (sinon expulsé)`,
        default: false,
        type: 'boolean'
    },
    mention_message: {
        name: 'Message de mention',
        value: 'mention_message',
        description: 'Affiche le message lors de la mention',
        default: true,
        type: 'boolean'
    },
    task_channel: {
        name: 'Salon des tâches',
        description: 'Salon dans lequel les tâches sont envoyées',
        type: 'channel',
        value: 'task_channel',
        default: null
    },
    task_enable: {
        name: 'Tâches activées',
        description: 'Définit si les tâches sont utilisables sur le serveur',
        value: 'task_enable',
        default: false,
        type: 'boolean'
    },
    level_rewards: {
        name: 'Récompenses de niveau',
        description: 'Active les récompenses de niveaux',
        value: 'level_rewards',
        default: false,
        type: 'boolean'
    },
    voice_role: {
        name: 'Rôle vocal',
        description: 'Rôle attribué aux membres en vocal',
        default: null,
        value: 'voice_role',
        type: 'role'
    },
    voice_role_enabled: {
        name: 'Système de rôle vocal',
        description: 'Active les rôles vocaux',
        default: false,
        type: 'boolean',
        value: 'voice_role_enabled'
    },
    temp_channels: {
        name: 'Salons temporaires',
        description: 'Active les salons temporaires',
        default: false,
        type: 'boolean',
        value: 'temp_channels'
    },
    welcome_image: {
        name: 'Image de bienvenue',
        description: "L'image de bienvenue du serveur",
        default: null,
        type: 'image',
        value: 'welcome_image'
    },
    welcome_image_radius: {
        name: "Rayon avatar de l'image de bienvenue",
        description: "Rayon de l'avatar de la photo de profil de l'image de bienvenue",
        default: 100,
        type: 'number',
        value: 'welcome_image_radius'
    },
    leave_image: {
        name: 'Image de départ',
        description: "L'image de départ du serveur",
        default: null,
        type: 'image',
        value: 'leave_image'
    },
    leave_image_radius: {
        name: "Rayon avatar de l'image de départ",
        description: "Rayon de l'avatar de la photo de profil de l'image de départ",
        default: 100,
        type: 'number',
        value: 'leave_image_radius'
    }
};
