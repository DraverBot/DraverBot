import { DatabasePools } from '../structures/Pools';

export default new DatabasePools({
    host: process.env.host,
    password: process.env.password,
    user: process.env.user,
    database: process.env.database
});
