import { AutocompleteListener } from "amethystjs";
import query from "../utils/query";
import { DatabaseTables, coupons } from "../typings/database";
import { sqliseString } from "../utils/toolbox";
import { GuildMember } from "discord.js";

export default new AutocompleteListener({
    listenerName: 'coupons',
    commandName: [{ commandName: 'admincoupons' }],
    run: (async ({ focused, focusedValue, interaction }) => {
        if (!interaction.guild || !(interaction.member as GuildMember).permissions.has('Administrator')) return [];

        const coupons = await query<coupons>(`SELECT coupon FROM ${DatabaseTables.Coupons} WHERE guild_id='${interaction.guild.id}' AND coupon LIKE "%${sqliseString(focusedValue)}%"`)
        return coupons.map(x => ({ name: x.coupon, value: x.coupon }));
    })
})