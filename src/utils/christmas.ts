import { readdirSync } from 'node:fs';
import { capitalize, random } from './toolbox';
import { cardAvatarPos } from '../typings/christmas';
import { registerFont } from 'canvas';

registerFont('./images/christmas/coolvetica.otf', { family: 'coolvetica' });

export const getRandomImagePath = (size: string) => {
    const paths = size.split('/');
    const basePath = `./images/christmas/sorted/${paths[0]}/${paths[1]}`;
    const files = readdirSync(basePath);

    return `${basePath}/${files[random({ max: files.length })]}`;
};
export const cardAvatarList = () =>
    Object.values(cardAvatarPos).map((x) => ({
        name: capitalize(
            ((c: string) => {
                if (c === cardAvatarPos.Center) return 'Milieu';
                [
                    ['middle', 'milieu'],
                    ['left', 'gauche'],
                    ['right', 'droite'],
                    ['bottom', 'bas'],
                    ['top', 'haut']
                ].forEach(([k, v]) => {
                    c = c.replace(k, v);
                });
                return c;
            })(x)
        ),
        value: x
    }));
