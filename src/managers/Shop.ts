import { CoinsManager } from 'coins-manager';
import { Collection } from 'discord.js';
import { DatabaseTables, Inventory, InventoryItem, ShopItem, ShopItemType } from '../typings/database';
import query from '../utils/query';
import { ShopManagerErrorReturns } from '../typings/managers';
import { removeKey, sqliseString } from '../utils/toolbox';

export class ShopManager {
    private coinsManger: CoinsManager<'multiguild'>;
    private shops: Collection<string, { guild_id: string; items: ShopItem[] }> = new Collection();
    private inventories: Collection<string, Collection<string, Inventory<false, true>>> = new Collection();

    constructor(coinsManger: CoinsManager<'multiguild'>) {
        this.coinsManger = coinsManger;

        this.start();
    }

    public buyItem({ guild_id, user_id, itemId }: { guild_id: string; user_id: string; itemId: number }) {
        const shop = this.shops.get(guild_id);
        const item = shop.items.find((x) => x.id === itemId);
        const data = this.coinsManger.getData({
            guild_id,
            user_id
        });

        if (item.quantityLeft === 0 && item.quantity > 0) return ShopManagerErrorReturns.EmptyStock;
        if (item.price > data.coins) return ShopManagerErrorReturns.NotEnoughCoins;

        this.addInInventory({
            user_id,
            guild_id,
            item: {
                itemName: item.itemName,
                value: item.price,
                roleId: item.roleId.length > 0 ? item.roleId : null,
                type: item.itemType
            }
        });
        this.coinsManger.removeCoins({
            guild_id,
            user_id,
            coins: item.price
        });
        if (item.quantity > 0) {
            shop.items[shop.items.indexOf(item)].quantityLeft--;

            this.shops.set(guild_id, shop);
            query(`UPDATE ${DatabaseTables.Shop} SET quantityLeft='${item.quantityLeft}' WHERE id='${itemId}'`);
        }
        return true;
    }
    public getShop(guild_id: string) {
        return this.shops.get(guild_id)?.items ?? [];
    }
    public updateItem(
        guild_id: string,
        {
            id,
            name,
            value,
            addStock,
            removeStock,
            quantity,
            roleId
        }: {
            id: number;
            name?: string;
            value?: number;
            addStock?: number;
            removeStock?: number;
            quantity?: number;
            roleId?: string;
        }
    ) {
        const shop = this.getShop(guild_id);
        const item = shop.find((x) => x.id === id);

        if (!item) return ShopManagerErrorReturns.ItemNotFound;

        const index = shop.indexOf(item);
        if (name) item.itemName = name;
        if (value) item.price = value;
        if (addStock && !removeStock) item.quantityLeft += Math.abs(addStock);
        if (removeStock && !addStock) item.quantityLeft -= Math.abs(removeStock);
        if (quantity) {
            item.quantity = Math.abs(quantity);
            if (item.quantityLeft > item.quantity) item.quantityLeft = item.quantity;
        }
        if (roleId) item.roleId;

        shop[index] = item;

        this.shops.set(guild_id, { guild_id, items: shop });
        query(
            `UPDATE ${DatabaseTables.Shop} SET itemName="${sqliseString(item.itemName)}", quantity="${
                item.quantity
            }", quantityLeft='${item.quantityLeft}', price="${item.price}", roleId="${roleId}" WHERE id='${item.id}'`
        );
        return true;
    }
    public addItem(
        guild_id: string,
        {
            name,
            price,
            type,
            roleId = '',
            quantity = 0
        }: { name: string; price: number; type: ShopItemType; roleId?: string; quantity?: number }
    ): Promise<ShopManagerErrorReturns.ItemAlreadyExist | ShopItem> {
        return new Promise(async (resolve) => {
            const shop = this.getShop(guild_id);

            if (shop.find((x) => x.itemName === name && x.price === price))
                resolve(ShopManagerErrorReturns.ItemAlreadyExist);
            await query(
                `INSERT INTO ${
                    DatabaseTables.Shop
                } ( guild_id, itemName, price, quantity, quantityLeft, roleId, itemType ) VALUES ( "${guild_id}", "${sqliseString(
                    name
                )}", "${price}", "${quantity}", "${quantity}", "${roleId}", "${type}" )`
            );
            const result = await query<ShopItem>(
                `SELECT * FROM ${DatabaseTables.Shop} WHERE guild_id='${guild_id}' AND itemName="${sqliseString(
                    name
                )}" AND itemType="${type}" ORDER BY id DESC`
            );

            shop.push(result[0]);
            this.shops.set(guild_id, { guild_id, items: shop });

            return resolve(result[0]);
        });
    }
    public removeItem(guild_id: string, id: number) {
        const shop = this.getShop(guild_id);
        const item = shop.find((x) => x.id === id);
        if (!item) return ShopManagerErrorReturns.ItemNotFound;

        shop.splice(shop.indexOf(item), 1);
        this.shops.set(guild_id, { guild_id, items: shop });

        query(`DELETE FROM ${DatabaseTables.Shop} WHERE id='${id}'`);
        return true;
    }

    public getInventory({ user_id, guild_id }: { user_id: string; guild_id: string }) {
        if (this.inventories.has(guild_id) && this.inventories.get(guild_id).has(user_id))
            return this.inventories.get(guild_id).get(user_id).inventory;
        return [];
    }
    private getId(array: (InventoryItem & { id: number })[]) {
        const sorted = array.sort((a, b) => a.id - b.id);
        if (sorted.length === 0) return 0;

        return sorted[sorted.length - 1].id + 1;
    }
    public addInInventory({
        user_id,
        guild_id,
        item
    }: {
        user_id: string;
        guild_id: string;
        item: { itemName: string; value: number; roleId?: string; type: ShopItemType };
    }) {
        if (!this.inventories.has(guild_id)) this.inventories.set(guild_id, new Collection());

        const inventory = this.getInventory({ user_id, guild_id });
        const testItem = inventory.find((x) => x.name === item.itemName && x.value === item.value);

        const wasEmpty = inventory.length < 1;

        if (testItem) {
            inventory[inventory.indexOf(testItem)].quantity++;
        } else {
            inventory.push({
                value: item.value,
                name: item.itemName,
                quantity: 1,
                id: this.getId(inventory),
                roleId: item.roleId ?? 'none',
                type: item.type
            });
        }

        this.inventories.get(guild_id).set(user_id, { guild_id, user_id, inventory });
        if (wasEmpty)
            query(
                `INSERT INTO ${
                    DatabaseTables.Inventories
                } ( guild_id, user_id, inventory ) VALUES ( "${guild_id}", "${user_id}", '${JSON.stringify(
                    inventory.map((x) => removeKey(x, 'id'))
                )}' )`
            );
        else
            query(
                `UPDATE ${DatabaseTables.Inventories} SET inventory='${JSON.stringify(
                    inventory.map((x) => removeKey(x, 'id'))
                )}' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
            );
        return inventory;
    }
    public removeFromInventory({
        user_id,
        guild_id,
        itemId,
        quantity = 1
    }: {
        user_id: string;
        guild_id: string;
        itemId: number;
        quantity?: number;
    }) {
        const inventory = this.getInventory({ user_id, guild_id });
        const item = inventory.find((x) => x.id === itemId);

        if (!item) return inventory;
        if (item.quantity - quantity < 1) {
            inventory.splice(inventory.indexOf(item), 1);
        } else {
            inventory[inventory.indexOf(item)].quantity -= quantity;
        }

        this.inventories.get(guild_id).set(user_id, { guild_id, user_id, inventory });
        query(
            `UPDATE ${DatabaseTables.Inventories} SET inventory='${JSON.stringify(
                inventory.map((x) => removeKey(x, 'id'))
            )}' WHERE guild_id='${guild_id}' AND user_id='${user_id}'`
        );
    }
    private async start() {
        await this.checkDb();
        await this.fillCache();
    }
    private async checkDb() {
        await Promise.all([
            query(
                `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Shop} ( guild_id VARCHAR(255) NOT NULL, itemType VARCHAR(255) NOT NULL, itemName VARCHAR(255) NOT NULL, price BIGINT NOT NULL, quantity BIGINT NOT NULL, roleId VARCHAR(255), id BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT )`
            ),
            query(
                `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Inventories} ( user_id VARCHAR(255) NOT NULL, guild_id VARCHAR(255) NOT NULL, inventory LONGTEXT )`
            )
        ]);
        return true;
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
                inventory: (JSON.parse(inventory.inventory) as InventoryItem[]).map((v, i) => ({ ...v, id: i }))
            });
        });
    }
}
