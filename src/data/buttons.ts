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
export const yesNoRow = () => {
    return row(yesBtn(), noBtn());
}