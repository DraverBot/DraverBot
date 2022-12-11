import { moduleDataType, moduleType } from '../typings/database';

export const modulesData: Record<moduleType, moduleDataType> = {
    moderation: {
        name: 'modération',
        editable: true,
        default: true,
        emoji: '🔨'
    },
    misc: {
        name: 'divers',
        editable: true,
        default: true,
        emoji: '☁️'
    },
    economy: {
        name: 'économie',
        editable: true,
        default: false,
        emoji: '🪙'
    },
    administration: {
        name: 'administration',
        editable: true,
        default: true,
        emoji: '⚒️'
    },
    config: {
        name: 'configuration',
        editable: false,
        default: true,
        emoji: '⚙️'
    },
    fun: {
        name: 'amusement',
        editable: true,
        default: true,
        emoji: '🥳'
    },
    giveaways: {
        name: 'giveaways',
        editable: true,
        default: false,
        emoji: '🎉'
    },
    information: {
        name: 'information',
        editable: true,
        default: true,
        emoji: 'ℹ️'
    },
    utils: {
        name: 'utilitaires',
        editable: true,
        default: true,
        emoji: '🔧'
    },
    level: {
        name: 'niveaux',
        editable: true,
        default: false,
        emoji: '🏆'
    },
    tickets: {
        name: 'tickets',
        editable: true,
        default: false,
        emoji: '📩'
    },
    interchat: {
        name: 'interserveur',
        editable: true,
        default: false,
        emoji: '💬'
    }
};
