import { defaultJokesTypes } from "../typings/database";

export const jokeNames: Record<keyof typeof defaultJokesTypes | 'random', string> = {
    global: 'général',
    dark: "noir",
    limit: 'limite',
    dev: 'développeur',
    beauf: 'beauf',
    blondes: 'blondes',
    random: 'aléatoire'
}