export type configOptionType = 'string' | 'number' | 'channel' | 'boolean';
export type configKeys = {
    logs_enable: boolean;
    logs_channel: string;
    level_channel: string;
    level_msg: string;
}
type configType = {
    description: string;
    name: string;
    type: configOptionType;
    value: keyof configKeys;
    default: string | boolean | number | null;
}

export const configsTypeData: Record<configOptionType, { name: string; description: string }> = {
    boolean: {
        name: "booléen",
        description: "État (vrai ou faux)"
    },
    string: {
        name: 'texte',
        description: "Texte"
    },
    number: {
        name: 'nombre',
        description: "Nombre"
    },
    channel: {
        name: "salon",
        description: "Salon"
    }
}
export const configsData: Record<keyof configKeys, configType> = {
    logs_channel: { name: 'salon des logs', value: 'logs_channel', type: 'channel', description: "Configure le salon des logs", default: null },
    logs_enable: { name: 'activation des logs', value: 'logs_enable', type: 'boolean', description: "Active/désactive les logs", default: false },
    level_channel: { name: 'salon des niveaux', value: 'logs_channel', type: 'channel', description: "Salon de l'envoi des messages de niveau", default: null },
    level_msg: { name: 'message de niveau', value: 'level_msg', type: 'string', description: "Message de niveau", default: "Bien joué {user.mention} ! Tu passes au niveau {user.level}" }
}