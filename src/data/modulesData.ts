import { moduleDataType, moduleType } from '../typings/database';

export const modulesData: Record<moduleType, moduleDataType> = {
    moderation: {
        name: 'modération',
        editable: true,
        default: true,
        emoji: '🔨',
        id: 'moderation'
    },
    misc: {
        name: 'divers',
        editable: true,
        default: true,
        emoji: '☁️',
        id: 'misc'
    },
    economy: {
        name: 'économie',
        editable: true,
        default: false,
        emoji: '🪙',
        id: 'economy'
    },
    administration: {
        name: 'administration',
        editable: true,
        default: true,
        emoji: '⚒️',
        id: 'administration'
    },
    config: {
        name: 'configuration',
        editable: false,
        default: true,
        emoji: '⚙️',
        id: 'config'
    },
    fun: {
        name: 'amusement',
        editable: true,
        default: true,
        emoji: '🥳',
        id: 'fun'
    },
    giveaways: {
        name: 'giveaways',
        editable: true,
        default: false,
        emoji: '🎉',
        id: 'giveaways'
    },
    information: {
        name: 'information',
        editable: true,
        default: true,
        emoji: 'ℹ️',
        id: 'information'
    },
    utils: {
        name: 'utilitaires',
        editable: true,
        default: true,
        emoji: '🔧',
        id: 'utils'
    },
    level: {
        name: 'niveaux',
        editable: true,
        default: false,
        emoji: '🏆',
        id: 'level'
    },
    tickets: {
        name: 'tickets',
        editable: true,
        default: false,
        emoji: '📩',
        id: 'tickets'
    },
    interchat: {
        name: 'interserveur',
        editable: true,
        default: false,
        emoji: '💬',
        id: 'interchat'
    }
};
