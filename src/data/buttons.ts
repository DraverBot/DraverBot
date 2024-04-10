import { translator } from '../translate/translate';
import { langResolvable } from '../typings/core';
import { ticketButtonIds } from '../typings/managers';
import { util } from '../utils/functions';
import { buildButton, notNull, row } from '../utils/toolbox';

export const yesBtn = (lang: langResolvable, options?: { label?: string }) => {
    return buildButton({
        label: options?.label ?? translator.translate('contents.global.buttons.yes', lang),
        id: 'yes',
        style: 'Success'
    });
};
export const noBtn = (lang: langResolvable, options?: { label?: string }) => {
    return buildButton({
        label: options?.label ?? translator.translate('contents.global.buttons.no', lang),
        id: 'no',
        style: 'Danger'
    });
};
enum paginatorButtons {
    Next = '▶️',
    Previous = '◀️',
    Last = '⏭️',
    First = '⏮️',
    Select = '🔢',
    Cancel = '❌'
}
export const nextPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Next,
        id: util('paginatorNext'),
        style: 'Primary',
        disabled
    });
};
export const previousPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Previous,
        id: util('paginatorPrevious'),
        style: 'Primary',
        disabled
    });
};
export const selectButton = () => {
    return buildButton({
        emoji: paginatorButtons.Select,
        id: util('paginatorSelect'),
        style: 'Success'
    });
};
export const firstPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.First,
        id: util('paginatorFirst'),
        style: 'Primary',
        disabled
    });
};
export const lastPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Last,
        id: util('paginatorLast'),
        style: 'Primary',
        disabled
    });
};
export const closePaginator = () => {
    return buildButton({
        emoji: paginatorButtons.Cancel,
        id: util('paginatorClose'),
        style: 'Danger'
    });
};
export const moduleEnabled = (enabled: boolean, moduleId: string, lang: langResolvable) => {
    return buildButton({
        label: translator.translate(`contents.global.buttons.module.${enabled ? 'enabled' : 'disabled'}`, lang),
        id: moduleId,
        style: 'Primary'
    });
};
export const frequenceBtn = (lang: langResolvable) => {
    return buildButton({
        label: translator.translate('contents.global.buttons.frequence', lang),
        id: 'interchat.see-frequence',
        style: 'Primary'
    });
};
export const inPocket = (lang: langResolvable) => {
    return buildButton({
        label: translator.translate(`contents.global.buttons.pocket`, lang),
        id: 'coins.pocket',
        style: 'Primary'
    });
};
export const inBank = (lang: langResolvable) => {
    return buildButton({
        label: translator.translate('contents.global.buttons.bank', lang),
        id: 'coins.bank',
        style: 'Primary'
    });
};
export const cancelButton = (lang: langResolvable) => {
    return buildButton({
        label: translator.translate('contents.global.buttons.cancel', lang),
        id: 'cancel',
        style: 'Danger'
    });
};
export const ticketsCreateButtons = (lang: langResolvable, mentionEveryone?: boolean) => {
    return [
        buildButton({
            label: translator.translate('contents.global.buttons.tickets.close', lang),
            id: ticketButtonIds.Close,
            style: 'Secondary',
            emoji: '🔐'
        }),
        mentionEveryone === true
            ? buildButton({
                  label: translator.translate('contents.global.buttons.tickets.mention', lang),
                  id: ticketButtonIds.Mention,
                  style: 'Danger'
              })
            : null
    ].filter(notNull);
};
export const ticketsClosedButtons = (lang: langResolvable) => {
    return [
        buildButton({
            label: translator.translate('contents.global.buttons.tickets.reopen', lang),
            id: ticketButtonIds.Reopen,
            emoji: '🔓',
            style: 'Primary'
        }),
        buildButton({
            label: translator.translate('contents.global.buttons.tickets.save', lang),
            id: ticketButtonIds.Save,
            emoji: '📑',
            style: 'Secondary'
        }),
        buildButton({
            label: translator.translate('contents.global.buttons.tickets.delete', lang),
            id: ticketButtonIds.Delete,
            emoji: '⛔',
            style: 'Danger'
        })
    ];
};

export const yesNoRow = (lang: langResolvable) => {
    return row(yesBtn(lang), noBtn(lang));
};
