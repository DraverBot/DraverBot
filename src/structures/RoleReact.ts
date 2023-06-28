import {
    Client,
    CollectedInteraction,
    Guild,
    GuildMember,
    InteractionCollector,
    Message,
    Role,
    StringSelectMenuBuilder,
    TextChannel
} from 'discord.js';
import { roleReactButtonType, roleReactType, roleReacts } from '../typings/rolereact';
import { basicEmbed, buildButton, notNull, pingRole, resizeString, row } from '../utils/toolbox';
import { color, getRolePerm } from '../utils/functions';
import { log4js } from 'amethystjs';
import query from '../utils/query';
import { DatabaseTables } from '../typings/database';

export class RoleReact {
    private _guild_id: string;
    private _channel_id: string;
    private _message_id: string;
    private _ids: roleReactButtonType[] = [];
    private _type: roleReactType | 'both';
    private _title: string;
    private _description: string;
    private _image = '';
    private _id: number;

    private _guild: Guild;
    private _channel: TextChannel;
    private _message: Message;
    private roles: Role[] = [];

    private collector: InteractionCollector<CollectedInteraction>;
    private _client: Client;

    public get client() {
        return this._client;
    }
    public get message() {
        return this._message;
    }
    public get channel() {
        return this._channel;
    }
    public get guild() {
        return this._guild;
    }
    public get id() {
        return this._id;
    }
    public get image() {
        return this._image;
    }
    public get description() {
        return this._description;
    }
    public get title() {
        return this._title;
    }
    public get type() {
        return this._type;
    }
    public get ids() {
        return this._ids;
    }
    public get message_id() {
        return this._message_id;
    }
    public get channel_id() {
        return this._channel_id;
    }
    public get guild_id() {
        return this._guild_id;
    }

    constructor(
        client: Client,
        { guild_id, channel_id, message_id, ids: values, type, title, description, image, id }: roleReacts
    ) {
        this._guild_id = guild_id;
        this._channel_id = channel_id;
        this._message_id = message_id;
        this._type = type;
        this._ids = JSON.parse(values);
        this._title = title;
        this._description = description;
        this._image = image;
        this._id = id;

        this._client = client;
        this.start();
    }

    public addRole({
        name,
        role_id,
        emoji,
        type
    }: {
        name: string;
        role_id: string;
        emoji: string | null;
        type: roleReactType;
    }) {
        if (this._ids.find((x) => x.role_id === role_id)) return 'already included';
        this._ids.push({
            name,
            role_id,
            emoji,
            type
        });

        this.edit();
        query(
            `UPDATE ${DatabaseTables.RoleReacts} SET values='${JSON.stringify(this._ids).replace(
                /'/g,
                "\\'"
            )}' WHERE id='${this._id}'`
        );
    }
    public removeRole(roleId: string) {
        this._ids = this._ids.filter((x) => x.role_id !== roleId);

        this.edit();
        query(
            `UPDATE ${DatabaseTables.RoleReacts} SET values='${JSON.stringify(this._ids).replace(
                /'/g,
                "\\'"
            )}' WHERE id='${this._id}'`
        );
    }
    public delete() {
        this.collector.stop();
        this._message.delete().catch(log4js.trace);

        query(`DELTE FROM ${DatabaseTables.RoleReacts} WHERE id='${this._id}'`);
    }
    private get components() {
        const buttons = () => {
            if (this._ids.filter((x) => x.type === 'buttons').length === 0) return [];
            const rows = [row()];

            this._ids
                .filter((x) => x.type === 'buttons')
                .forEach((id, i) => {
                    if (i % 5 === 0 && i > 0) rows.push(row());
                    rows[rows.length - 1].addComponents(
                        buildButton({
                            label: resizeString({ str: id.name, length: 50 }),
                            emoji: notNull(id.emoji) ? id.emoji : undefined,
                            id: `roleReact.${i.toString()}`,
                            style: 'Primary'
                        })
                    );
                });
            if (rows[0].components?.length === 0) return [];

            return rows;
        };
        const selectMenus = () => {
            if (this._ids.filter((x) => x.type === 'selectmenu')) return [];
            const menus = [new StringSelectMenuBuilder().setCustomId('roleReact.1').setMaxValues(1)];

            this._ids
                .filter((x) => x.type === 'selectmenu')
                .forEach((id, i) => {
                    if (i % 25 === 0 && i > 0)
                        menus.push(
                            new StringSelectMenuBuilder().setCustomId(`roleReact.${menus.length + 1}`).setMaxValues(1)
                        );

                    menus[menus.length - 1].addOptions({
                        label: resizeString({ str: id.name, length: 50 }),
                        description: `Rôle à réaction`,
                        emoji: notNull(id.emoji) ? id.emoji : undefined,
                        value: id.role_id
                    });
                });
            if (menus[0].data.options?.length === 0) return [];
            return menus.map((x) => row(x));
        };

        return {
            buttons: buttons(),
            menus: selectMenus()
        };
    }
    private get embed() {
        const em = basicEmbed(this._client.user)
            .setColor(color('roleReact'))
            .setTitle(resizeString({ str: this._title, length: 256 }))
            .setDescription(resizeString({ str: this._description, length: 4096 }));

        if (this._image.length > 0) em.setImage(this._image);

        return em;
    }
    public edit() {
        const components = () => {
            const cmps = this.components;
            if (cmps.buttons.length + cmps.menus.length > 5) {
                const buttons = cmps.buttons.splice(0, 4);
                const menus = cmps.menus.splice(0, 5 - buttons.length);

                return [...buttons, ...menus];
            } else {
                return [...cmps.buttons, ...cmps.menus];
            }
        };
        this._message
            .edit({
                embeds: [this.embed],
                components: components()
            })
            .catch(log4js.trace);
    }
    private async fetchRoles() {
        await this._guild.roles.fetch().catch(log4js.trace);
        this.roles = this._guild.roles.cache.filter((x) => this._ids.find((y) => y.role_id === x.id)).toJSON();
    }
    private async start() {
        this._guild = this._client.guilds.cache.get(this._guild_id);
        if (!this._guild) return log4js.trace({ message: 'No guild found for a role react', id: this._id });

        this._channel = (await this._guild.channels.fetch(this._channel_id).catch(log4js.trace)) as TextChannel;
        if (!this._channel) return log4js.trace({ message: 'No channel found for a role react', id: this._id });

        await this._channel.messages.fetch().catch(log4js.trace);
        this._message = this._channel.messages.cache.get(this._message_id);
        if (!this._message) return log4js.trace({ message: 'No message found for a role react', id: this._id });

        this.edit();
        this.fetchRoles();
        this.collector = this._message.createMessageComponentCollector({});

        this.collector.on('collect', async (ctx) => {
            if (ctx.isButton()) {
                const roleIndex = parseInt(ctx.customId.split('.')[1]);
                console.log(ctx.customId);
                console.log(roleIndex);
                const value = this._ids.filter((x) => x.type === 'buttons')[roleIndex];
                console.log(value);

                await ctx.deferReply({ ephemeral: true }).catch(log4js.trace);
                const role =
                    this.roles.find((x) => x.id === value.role_id) ??
                    (await this._guild.roles.fetch(value.role_id).catch(log4js.trace));

                if (!role) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(ctx.user, { evoker: this._guild })
                                .setTitle('Rôle introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver le rôle qui correspond à \`${
                                        value.name
                                    }\`\nVérifiez que ce rôle existe encore, et que j'aie la permission \`${getRolePerm(
                                        'ManageRoles'
                                    )}\``
                                )
                        ]
                    }).catch(log4js.trace);
                    return;
                }

                const method = (ctx.member as GuildMember).roles.cache.has(role.id) ? 'remove' : 'add';
                const res = await (ctx.member as GuildMember).roles[method](role).catch(log4js.trace);
                if (!res) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(ctx.user, { evoker: this._guild })
                                .setTitle('Rôle non ajouté')
                                .setDescription(
                                    `Le rôle n'a pas pu vous être ajouté, cela peut être du aux permissions et à ma position par rapport à vous.\nVérifiez que je posède la permission \`${getRolePerm(
                                        'ManageRoles'
                                    )}\` et que mon rôle soit au-dessus des autres`
                                )
                        ]
                    }).catch(log4js.trace);
                    return;
                }
                ctx.editReply({
                    embeds: [
                        basicEmbed(ctx.user, { draverColor: true })
                            .setTitle('Rôle ajouté')
                            .setDescription(
                                `Le rôle ${pingRole(role)} vous a été ${method === 'add' ? 'ajouté' : 'retiré'}`
                            )
                    ]
                }).catch(log4js.trace);
            }
            if (ctx.isStringSelectMenu()) {
                const id = this._ids.find((x) => x.role_id === ctx.values[0]);

                await ctx.deferReply({ ephemeral: true }).catch(log4js.trace);
                const role =
                    this.roles.find((x) => x.id === id.role_id) ??
                    (await this._guild.roles.fetch(id.role_id).catch(log4js.trace));

                if (!role) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(ctx.user, { evoker: this._guild })
                                .setTitle('Rôle introuvable')
                                .setDescription(
                                    `Je n'ai pas pu trouver le rôle qui correspond à \`${
                                        id.name
                                    }\`\nVérifiez que ce rôle existe encore, et que j'aie la permission \`${getRolePerm(
                                        'ManageRoles'
                                    )}\``
                                )
                        ]
                    }).catch(log4js.trace);
                    return;
                }

                const method = (ctx.member as GuildMember).roles.cache.has(role.id) ? 'remove' : 'add';
                const res = await (ctx.member as GuildMember).roles[method](role).catch(log4js.trace);
                if (!res) {
                    ctx.editReply({
                        embeds: [
                            basicEmbed(ctx.user, { evoker: this._guild })
                                .setTitle('Rôle non ajouté')
                                .setDescription(
                                    `Le rôle n'a pas pu vous être ajouté, cela peut être du aux permissions et à ma position par rapport à vous.\nVérifiez que je posède la permission \`${getRolePerm(
                                        'ManageRoles'
                                    )}\` et que mon rôle soit au-dessus des autres`
                                )
                        ]
                    }).catch(log4js.trace);
                    return;
                }
                ctx.editReply({
                    embeds: [
                        basicEmbed(ctx.user, { draverColor: true })
                            .setTitle('Rôle ajouté')
                            .setDescription(`Le rôle ${pingRole(role)} vous a aété ajouté`)
                    ]
                }).catch(log4js.trace);
            }
        });
    }
}
