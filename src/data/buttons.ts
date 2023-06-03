import { ticketButtonIds } from '../typings/managers';
import { util } from '../utils/functions';
import { buildButton, notNull, row } from '../utils/toolbox';

export const yesBtn = (options?: { label?: string }) => {
    return buildButton({
        label: options?.label ?? 'Oui',
        id: 'yes',
        style: 'Success'
    });
};
export const noBtn = (options?: { label?: string }) => {
    return buildButton({
        label: options?.label ?? 'Non',
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
export const moduleEnabled = (enabled: boolean, moduleId: string) => {
    return buildButton({
        label: enabled ? 'Désactiver' : 'Activer',
        id: moduleId,
        style: 'Primary'
    });
};
export const frequenceBtn = () => {
    return buildButton({
        label: 'Fréquence',
        id: 'interchat.see-frequence',
        style: 'Primary'
    });
};
export const inPocket = () => {
    return buildButton({
        label: 'En poche',
        id: 'coins.pocket',
        style: 'Primary'
    });
};
export const inBank = () => {
    return buildButton({
        label: 'En banque',
        id: 'coins.bank',
        style: 'Primary'
    });
};
export const cancelButton = () => {
    return buildButton({
        label: 'Annuler',
        id: 'cancel',
        style: 'Danger'
    });
};
export const ticketsCreateButtons = (mentionEveryone?: boolean) => {
    return [
        buildButton({
            label: 'Fermer',
            id: ticketButtonIds.Close,
            style: 'Secondary',
            emoji: '🔐'
        }),
        mentionEveryone === true
            ? buildButton({
                  label: 'Mentionner everyone',
                  id: ticketButtonIds.Mention,
                  style: 'Danger'
              })
            : null
    ].filter(notNull);
};
export const ticketsClosedButtons = () => {
    return [
        buildButton({
            label: 'Réouvrir',
            id: ticketButtonIds.Reopen,
            emoji: '🔓',
            style: 'Primary'
        }),
        buildButton({
            label: 'Sauvegarder',
            id: ticketButtonIds.Save,
            emoji: '📑',
            style: 'Secondary'
        }),
        buildButton({
            label: 'Supprimer',
            id: ticketButtonIds.Delete,
            emoji: '⛔',
            style: 'Danger'
        })
    ];
};

export const yesNoRow = () => {
    return row(yesBtn(), noBtn());
};
