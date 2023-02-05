import { CoinsManager } from 'coins-manager';
import { Collection } from 'discord.js';
import { DatabaseTables, Inventory, InventoryItem, ShopItem } from '../typings/database';
import query from '../utils/query';
import { ShopManagerErrorReturns } from '../typings/managers';

export class ShopManager {
    private coinsManger: CoinsManager<'multiguild'>;
    private shops: Collection<string, { guild_id: string; items: ShopItem[] }> = new Collection();
    private inventories: Collection<string, Collection<string, Inventory<false>>> = new Collection();

    constructor(coinsManger: CoinsManager<'multiguild'>) {
        this.coinsManger = coinsManger;

        this.start();
    }

    public buyItem({ guild_id, user_id, itemName }: { guild_id: string; user_id: string; itemName: string }) {
        const shop = this.shops.get(guild_id);
        const item = shop.items.find((x) => x.itemName === itemName);
        const data = this.coinsManger.getData({
            guild_id,
            user_id
        });

        if (item.quantityLeft === 0 && item.quantity > 0) return ShopManagerErrorReturns.EmptyStock;
        if (item.price > data.coins) return ShopManagerErrorReturns.NotEnoughCoins;
    }

    public getInventory({ user_id, guild_id }: { user_id: string; guild_id: string }): InventoryItem[] {
        if (this.inventories.has(guild_id) && this.inventories.get(guild_id).has(user_id))
            return this.inventories.get(guild_id).get(user_id).inventory;
        return [];
    }
    public addInInventory({
        user_id,
        guild_id,
        item
    }: {
        user_id: string;
        guild_id: string;
        item: { itemName: string; value: number };
    }) {
        const inventory = this.getInventory({ user_id, guild_id });
        const testItem = inventory.find((x) => x.name === item.itemName && x.value === item.value);

        if (testItem) {
            inventory[inventory.indexOf(testItem)].quantity++;
        } else {
            inventory.push({
                value: item.value,
                name: item.itemName,
                quantity: 1
            });
        }

        this.inventories.get(guild_id).set(user_id, { guild_id, user_id, inventory });
        query(
            `UPDATE ${DatabaseTables.Inventories} SET inventory='${JSON.stringify(
                inventory
            )}' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
        );
        return inventory;
    }
    public removeFromInventory({
        user_id,
        guild_id,
        itemData,
        quantity = 1
    }: {
        user_id: string;
        guild_id: string;
        itemData: { name: string; value: number };
        quantity?: number;
    }) {
        const inventory = this.getInventory({ user_id, guild_id });
        const item = inventory.find((x) => x.name === itemData.name && x.value === itemData.value);

        if (!item) return inventory;
        if (item.quantity - quantity < 1) {
            inventory.splice(inventory.indexOf(item), 1);
        } else {
            inventory[inventory.indexOf(item)].quantity -= quantity;
        }

        this.inventories.get(guild_id).set(user_id, { guild_id, user_id, inventory });
        query(
            `UPDATE ${DatabaseTables.Inventories} SET inventory='${JSON.stringify(
                inventory
            )}' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
        );
    }
    private async start() {
        await this.fillCache();
    }
    private async fillCache() {
        const shops = await query<ShopItem>(`SELECT * FROM ${DatabaseTables.Shop}`);

        shops.forEach((shop) => {
            if (!this.shops.has(shop.guild_id)) this.shops.set(shop.guild_id, { guild_id: shop.guild_id, items: [] });

            const sh = this.shops.get(shop.guild_id);
            sh.items.push(shop);
            this.shops.set(shop.guild_id, sh);
        });
        const inventories = await query<Inventory>(`SELECT * FROM ${DatabaseTables.Inventories}`);

        inventories.forEach((inventory) => {
            if (!this.inventories.has(inventory.guild_id)) this.inventories.set(inventory.guild_id, new Collection());

            this.inventories.get(inventory.guild_id).set(inventory.user_id, {
                ...inventory,
                inventory: JSON.parse(inventory.inventory)
            });
        });
    }
}
