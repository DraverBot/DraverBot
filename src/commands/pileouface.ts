import { DraverCommand } from '../structures/DraverCommand';
import { ApplicationCommandOptionType } from 'discord.js';
import moduleEnabled from '../preconditions/moduleEnabled';
import { random } from '../utils/toolbox';

enum Pof {
    Pile = 'pile',
    Face = 'face',
    Middle = 'la tranche'
}

export default new DraverCommand({
    name: 'pile-ou-face',
    module: 'fun',
    description: 'Joue à pile ou face',
    options: [
        {
            name: 'pari',
            description: 'Votre pronostic sur le lancer de la pièce',
            required: false,
            type: ApplicationCommandOptionType.String,
            choices: [
                {
                    name: 'Pile',
                    value: Pof.Pile
                },
                {
                    name: 'Face',
                    value: Pof.Face
                }
            ]
        }
    ],
    preconditions: [moduleEnabled]
}).setChatInputRun(({ interaction, options }) => {
    const choice = options.getString('pari');

    const poss = [Pof.Face, Pof.Pile];
    if (random({ max: 10000 }) === 5691) poss.push(Pof.Middle);

    const fall = poss[random({ max: poss.length })];
    const win = fall === choice;

    interaction
        .reply(
            `La pièce est tombée sur **${fall}**${choice ? `\nVous avez ${win ? 'gagné' : 'perdu'} votre pari` : ''}`
        )
        .catch(() => {});
});
