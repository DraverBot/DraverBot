import { Process } from '../structures/Process';
import { modActionType } from '../typings/database';
import { BenderAPIOptions } from '../typings/apis';

export default new Process(
    'Bender API Post',
    async <T extends keyof typeof modActionType>(type: T, {}: BenderAPIOptions<T>) => {}
);
