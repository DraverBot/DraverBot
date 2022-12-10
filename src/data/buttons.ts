import { util } from "../utils/functions"
import { buildButton, row } from "../utils/toolbox"

export const yesBtn = () => {
    return buildButton({
        label: 'Oui',
        id: 'yes',
        style: 'Success'
    })
}
export const noBtn = () => {
    return buildButton({
        label: 'Non',
        id: 'no',
        style: 'Danger'
    })
}
enum paginatorButtons {
    Next = "▶️",
    Previous = "◀️",
    Last = "⏭️",
    First = "⏮️",
    Select = "🔢",
    Cancel = "❌"
}
export const nextPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Next,
        id: util('paginatorNext'),
        style: 'Primary',
        disabled
    })
}
export const previousPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Previous,
        id: util('paginatorPrevious'),
        style: 'Primary',
        disabled
    })
}
export const selectButton = () => {
    return buildButton({
        emoji: paginatorButtons.Select,
        id: util('paginatorSelect'),
        style: 'Success'
    })
}
export const firstPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.First,
        id: util('paginatorFirst'),
        style: 'Primary',
        disabled
    })
}
export const lastPage = (disabled = false) => {
    return buildButton({
        emoji: paginatorButtons.Last,
        id: util('paginatorLast'),
        style: 'Primary',
        disabled
    })
}
export const closePaginator = () => {
    return buildButton({
        emoji: paginatorButtons.Cancel,
        id: util('paginatorClose'),
        style: 'Danger'
    })
}
export const moduleEnabled = (enabled: boolean) => {
    return buildButton({
        label: enabled ? 'Activé' : 'Désactivé',
        id: 'moduleEnabledOrNot',
        style: 'Primary',
        disabled: true
    })
}
export const frequenceBtn = () => {
    return buildButton({
        label: 'Fréquence',
        id: 'interchat.see-frequence',
        style: 'Primary'
    })
}

export const yesNoRow = () => {
    return row(yesBtn(), noBtn());
}