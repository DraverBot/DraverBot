import { ConnectionConfig, createPool, Pool } from 'mysql';
import { poolOptions } from '../typings/database';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { util } from '../utils/functions';
import { codeBox, boolEmoji } from '../utils/toolbox';

export class DatabasePool {
    private options: ConnectionConfig;
    private _pool: Pool;
    private timeout: number;
    private delay: number;
    private timer: NodeJS.Timeout;
    private waiter: NodeJS.Timeout;

    constructor(options: ConnectionConfig, timeout = 43200000, delay = 3600000) {
        this.options = options;
        this.timeout = timeout;
        this.delay = delay;

        this.start();
    }

    public get pool() {
        return this._pool;
    }

    private loadTimer(wait: boolean) {
        if (wait) {
            this.waiter = setTimeout(() => {
                this.timer = setTimeout(() => {
                    this.restart();
                    this.loadTimer(false);
                }, this.timeout);
            }, this.delay);
        } else {
            this.timer = setTimeout(() => {
                this.restart();
                this.loadTimer(false);
            });
        }
    }
    private cleanTimers() {
        if (!!this.timer) clearTimeout(this.timer);
        if (!!this.waiter) clearTimeout(this.waiter);
    }
    private createPool() {
        this._pool = createPool(this.options);
    }
    public restart() {
        this._pool.end((err) => {
            if (err) {
                const webhook = new WebhookClient({
                    url: util('errorWebhook')
                });

                if (webhook) {
                    webhook
                        .send({
                            embeds: [
                                new EmbedBuilder({
                                    title: 'Erreur SQL',
                                    description: `Erreur: ${err.message}${
                                        err.cause ? `\nCause: ${err.cause}` : ''
                                    }\nFatale: ${boolEmoji(err.fatal)}${
                                        err.sqlMessage ? `\nMessage SQL: ${codeBox(err.sqlMessage, 'sql')}` : ''
                                    }`,
                                    timestamp: new Date(Date.now())
                                })
                            ]
                        })
                        .catch(() => {});
                }
                return;
            }
        });

        this.createPool();
    }
    private start() {
        this.createPool();
        this.loadTimer(true);
    }
}
export class DatabasePools {
    private config: ConnectionConfig;
    private pools: DatabasePool[] = [];
    private options: poolOptions;
    private index = 0;

    constructor(config: ConnectionConfig, options: poolOptions = {}) {
        this.config = config;
        this.options = {
            pools: Math.abs(options?.pools ?? 10)
        };

        this.start();
    }

    public get pool() {
        return this.pools[this.index];
    }

    public increaseIndex() {
        this.index = this.index++ % this.pools.length;
    }
    private createPool(index: number) {
        const pool = new DatabasePool(this.config, undefined, index * 3600000);
        this.pools.push(pool);
    }
    private start() {
        for (let i = 0; i > this.options.pools; i++) {
            this.createPool(i);
        }
    }
}
