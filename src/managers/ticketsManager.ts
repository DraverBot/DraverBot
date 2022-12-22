import {
    AttachmentBuilder,
    ChannelType,
    Client,
    Collection,
    EmbedBuilder,
    Guild,
    Message,
    OverwriteResolvable,
    TextChannel,
    User
} from 'discord.js';
import { ticketChannels, ticketModRoles, ticketPanels, ticketState, DatabaseTables } from '../typings/database';
import query from '../utils/query';
import {
    closeTicketOptions,
    createPanelOptions,
    ticketButtonIds,
    createTicketOptions,
    reopenTicketOptions,
    deletePanelOptions
} from '../typings/managers';
import {
    arrayfy,
    basicEmbed,
    buildButton,
    confirm,
    displayDate,
    evokerColor,
    hint,
    notNull,
    pingChan,
    pingUser,
    row,
    sqliseString
} from '../utils/toolbox';
import { getPerm, util } from '../utils/functions';
import { ticketsClosedButtons, ticketsCreateButtons } from '../data/buttons';
import htmlSave from '../utils/htmlSave';
import { rmSync } from 'fs';
import { confirmReturn } from '../typings/functions';
import replies from '../data/replies';

export class TicketsManager {
    public readonly client: Client;

    private _tickets: Collection<string, ticketChannels> = new Collection();
    private _panels: Collection<string, ticketPanels> = new Collection();
    private _modRoles: Collection<string, ticketModRoles<true>> = new Collection();

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    // Starting block
    private async start() {
        await this.checkDb();
        await this.fillCache();

        this.setEvent();
    }

    // Public methods

    /* Tickets part */
    public createTicket<OptionsType extends boolean = boolean>({
        guild,
        user,
        ...opts
    }: createTicketOptions<OptionsType>): Promise<{ ticket?: ticketChannels; embed: EmbedBuilder }> {
        return new Promise(async (resolve) => {
            const userTicket = this._tickets.find((x) => x.guild_id === guild.id && x.user_id === user.id);
            const hasRole = notNull(userTicket);

            if (hasRole)
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle('Ticket déjà crée')
                        .setDescription(`Vous avez déjà un ticket ouvert dans ${pingChan(userTicket.channel_id)}`)
                        .setColor(evokerColor(guild))
                });

            const roles = this.getServerModroles(guild.id).roles;
            const permissions = [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: [
                        'ViewChannel',
                        'SendMessages',
                        'SendTTSMessages',
                        'EmbedLinks',
                        'AttachFiles',
                        'UseApplicationCommands'
                    ]
                }
            ];

            for (const role of roles) {
                permissions.push({
                    id: role,
                    allow: [
                        'ViewChannel',
                        'SendMessages',
                        'SendTTSMessages',
                        'EmbedLinks',
                        'AttachFiles',
                        'UseApplicationCommands'
                    ]
                });
            }

            let data = {
                subject: '',
                description: null,
                image: undefined
            };
            if (opts?.panel_id) {
                const panel = this.findPanel({ panel_reference: opts.panel_id, guild: guild.id });

                data.subject = panel.subject;
                data.description = panel.description.length > 0 ? panel.description : null;
                data.image = panel.image.length > 0 ? panel.image : undefined;
            } else {
                data.subject = opts.subject;
                data.description = opts.description ?? null;
            }

            const ticket = (await guild.channels
                .create({
                    name: this.generateTicketName(guild.id),
                    topic: `Ticket de ${pingUser(user)}`,
                    permissionOverwrites: permissions as OverwriteResolvable[],
                    reason: `Ticket ouvert par ${user.id}\n> Au sujet de ${data.subject}`,
                    type: ChannelType.GuildText
                })
                .catch(() => {})) as TextChannel;

            if (!ticket)
                return {
                    embed: basicEmbed(user)
                        .setTitle('Salon non-crée')
                        .setDescription(
                            `Le salon n'a pas pu être crée.\nContactez un administrateur du serveur pour lui faire part de cette erreur et pour vérifier que je possède bien la permission **${getPerm(
                                'ManageChannels'
                            )}**`
                        )
                        .setColor(evokerColor(guild))
                };

            const embed = basicEmbed(user)
                .setColor(guild.members.me.displayHexColor ?? util('accentColor'))
                .setTitle(data.subject)
                .setDescription(
                    `Ticket ouvert par ${pingUser(user)} ${displayDate()}${
                        data.description ? '\n' + data.description : ''
                    }`
                );

            if (data.image?.length > 0) embed.setThumbnail(data.image);

            const msg = (await ticket
                .send({
                    embeds: [embed],
                    components: [this.createComponents],
                    content: pingUser(user)
                })
                .catch(() => {})) as Message<true>;
            if (!msg) {
                ticket.delete().catch(() => {});
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle('Message non-envoyé')
                        .setDescription(
                            `La création du ticket a été annulé car je n'ai pas pu envoyer le message dans ce ticket`
                        )
                        .setColor(evokerColor(guild))
                });
            }

            const ticketDatas = {
                channel_id: ticket.id,
                guild_id: guild.id,
                user_id: user.id,
                state: 'open' as ticketState,
                panel_reference: opts.panel_id ?? 0,
                message_id: msg.id,
                channelName: ticket.name
            };
            this._tickets.set(msg.id, ticketDatas);
            const sql = `INSERT INTO ${
                DatabaseTables.Tickets
            } ( guild_id, channel_id, user_id, message_id, panel_reference, state, channelName ) VALUES ( '${
                guild.id
            }', '${ticket.id}', '${user.id}',  '${msg.id}', '${
                ticketDatas.panel_reference
            }', 'open', "${sqliseString(ticket.name)}" )`
            await query(
                sql
            );

            return resolve({
                ticket: ticketDatas,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Ticket crée')
                    .setDescription(`Votre ticket a été crée dans ${pingChan(ticket)}`)
            });
        });
    }

    public closeTicket({
        guild,
        user,
        message_id
    }: closeTicketOptions): Promise<{ embed: EmbedBuilder; ticket?: ticketChannels }> {
        const ticket = this._tickets.get(message_id);
        const panel = this.findPanel({ panel_reference: ticket.panel_reference, guild: guild.id });

        return new Promise(async (resolve) => {
            if (ticket.state === 'closed')
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle('Ticket fermé')
                        .setDescription(`Le ticket est déjà fermé`)
                        .setColor(evokerColor(guild))
                });

            const channel = guild.channels.cache.get(ticket.channel_id) as TextChannel;
            if (!channel)
                return resolve({
                    embed: this.invalidChannel(user, guild)
                });
            const message = channel.messages.cache.get(message_id);
            if (!message)
                return resolve({
                    embed: this.invalidMessage(user, guild)
                });

            await Promise.all([
                channel.permissionOverwrites
                    .edit(ticket.user_id, {
                        ViewChannel: false
                    })
                    .catch(console.log),
                channel.setName(`${ticket.channelName}-closed`).catch(() => {}),
                message
                    .edit({
                        components: [row(...ticketsClosedButtons())]
                    })
                    .catch(() => {})
            ]).catch(() => {});

            ticket.state = 'closed';
            this._tickets.set(ticket.message_id, ticket);

            await query(
                `UPDATE ${DatabaseTables.Tickets} SET state='closed' WHERE message_id='${message.id}'`
            );
            return resolve({
                ticket,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Ticket fermé')
                    .setDescription(`Le ticket de ${pingUser(ticket.user_id)} a été fermé`)
            });
        });
    }

    public reopenTicket({
        guild,
        message_id,
        user
    }: reopenTicketOptions): Promise<{ embed: EmbedBuilder; ticket?: ticketChannels }> {
        return new Promise(async (resolve) => {
            const ticket = this._tickets.get(message_id);
            if (ticket.state === 'open')
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle('Ticket ouvert')
                        .setDescription(`Le ticket est ouvert`)
                        .setColor(evokerColor(guild))
                });

            const channel = this.fetchChannel(message_id, guild);
            if (!channel)
                return resolve({
                    embed: this.invalidChannel(user, guild)
                });
            const message = this.fetchMessage(message_id, channel);
            if (!message)
                return resolve({
                    embed: this.invalidMessage(user, guild)
                });

            await Promise.all([
                channel.permissionOverwrites.edit(ticket.user_id, {
                    ViewChannel: true
                }),
                channel.setName(ticket.channelName),
                message.edit({
                    components: [this.createComponentsNoMention]
                })
            ]);

            ticket.state = 'open';
            this._tickets.set(message_id, ticket);
            await query(
                `UPDATE ${DatabaseTables.Tickets} SET state='open' WHERE message_id='${ticket.message_id}'`
            );
            resolve({
                ticket,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Ticket réouvert')
                    .setDescription(`Le ticket de ${pingUser(user)} a été réouvert`)
            });
        });
    }
    public renameChannel({
        channel_id,
        name,
        guild,
        user
    }: {
        channel_id: string;
        name: string;
        guild: Guild;
        user: User;
    }): Promise<{ embed: EmbedBuilder; ticket?: ticketChannels }> {
        return new Promise(async (resolve) => {
            const ticket = this._tickets.find((x) => x.channel_id === channel_id);
            const channel = this.fetchChannel(ticket.message_id, guild);

            await channel.setName(name + (ticket.state === 'closed' ? '-closed' : '')).catch(() => {});

            ticket.channelName = name;
            this._tickets.set(ticket.message_id, ticket);
            await query(
                `UPDATE ${DatabaseTables.Tickets} SET channelName="${sqliseString(name)}" WHERE message_id='${
                    ticket.message_id
                }')`
            );

            return resolve({
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Nom changé')
                    .setDescription(`Le nom du ticket a été changé`),
                ticket
            });
        });
    }
    public addOrRemoveUser({
        channel_id,
        user,
        action,
        guild
    }: {
        channel_id: string;
        user: User;
        action: 'add' | 'remove';
        guild: Guild;
    }): Promise<{ ticket?: ticketChannels; embed: EmbedBuilder }> {
        return new Promise(async (resolve) => {
            const ticket = this._tickets.find((x) => x.channel_id === channel_id);
            const channel = this.fetchChannel(ticket.message_id, guild);

            if (user.id === ticket.user_id)
                return resolve({
                    embed: basicEmbed(user)
                        .setColor(evokerColor(guild))
                        .setTitle('Modification impossible')
                        .setDescription(
                            `Vous ne pouvez pas ${action === 'add' ? 'ajouter' : 'retirer'} ${pingUser(
                                user
                            )} car il est le propriétaire du ticket`
                        )
                });
            if (action === 'add') {
                await channel.permissionOverwrites
                    .edit(user, {
                        ViewChannel: true,
                        EmbedLinks: true,
                        SendMessages: true,
                        SendTTSMessages: true,
                        UseApplicationCommands: true
                    })
                    .catch(() => {});
            } else {
                await channel.permissionOverwrites
                    .edit(user, {
                        ViewChannel: false
                    })
                    .catch(() => {});
            }

            return resolve({
                ticket,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Utilisateur ' + (action === 'add' ? 'ajouté' : 'retiré'))
                    .setDescription(`${pingUser(user)} a été ${action === 'add' ? 'ajouté' : 'retiré'} du ticket`)
            });
        });
    }
    public saveTicket({
        channel_id,
        user,
        guild
    }: {
        channel_id: string;
        user: User;
        guild: Guild;
    }): Promise<{ ok: boolean; ticket?: ticketChannels; embed: EmbedBuilder; id?: string }> {
        return new Promise(async (resolve) => {
            const ticket = this._tickets.find((x) => x.channel_id === channel_id);
            const channel = this.fetchChannel(ticket.message_id, guild);
            if (!channel) return resolve({ embed: this.invalidChannel(user, guild), ok: false });

            const messages = await channel.messages.fetch({}).catch(() => {});
            if (!messages || messages.size === 0)
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle('Aucun message')
                        .setDescription(`Il n'y a aucun message à sauvegarder`)
                        .setColor(evokerColor(guild)),
                    ok: false
                });

            const id = `${ticket.channelName}-${channel_id}`;
            htmlSave(messages.reverse(), id);
            setTimeout(() => {
                rmSync(`./dist/saves/${id}.html`);
            }, 20000);

            return resolve({
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Sauvegarde')
                    .setDescription(`La conversation a été sauvegardée`),
                ok: true,
                ticket,
                id
            });
        });
    }
    public async mentionEveryone(message_id: string, guild: Guild) {
        const ticket = this._tickets.get(message_id);
        const channel = this.fetchChannel(message_id, guild);

        if (!channel) return;
        const msg = this.fetchMessage(ticket.message_id, channel);
        if (!msg) return;

        await msg
            .edit({
                components: [this.createComponentsNoMention]
            })
            .catch(() => {});

        channel
            .send({
                content: `@everyone. Cette mention a eu lieu lorsque quelqu'un a appuyé sur le bouton "mentionner everyone" dans le ticket.`,
                reply: {
                    messageReference: ticket.message_id
                }
            })
            .catch(() => {});
    }
    public deleteTicket({
        message_id,
        user,
        guild
    }: {
        message_id: string;
        user: User;
        guild: Guild;
    }): Promise<{ ticket?: ticketChannels; embed: EmbedBuilder }> {
        return new Promise(async (resolve) => {
            const ticket = this._tickets.get(message_id);

            const channel = this.fetchChannel(message_id, guild);
            if (!channel)
                return resolve({
                    embed: this.invalidChannel(user, guild)
                });
            const message = this.fetchMessage(message_id, channel);
            if (!message)
                return resolve({
                    embed: this.invalidMessage(user, guild)
                });

            channel.delete().catch(() => {});

            this._tickets.delete(message_id);
            await query(`DELETE FROM ${DatabaseTables.Tickets} WHERE message_id='${message.id}'`);
            resolve({
                ticket,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Ticket fermé')
                    .setDescription(`Le ticket de ${pingUser(user)} a été fermé`)
            });
        });
    }
    public getTicketsList(guild_id: string) {
        return this._tickets.filter((x) => x.guild_id === guild_id) ?? new Collection<string, ticketChannels>();
    }

    /* End tickets part */
    /* Modroles part */

    public getServerModroles(guild_id: string) {
        return this._modRoles.get(guild_id) ?? { guild_id, roles: [] };
    }
    public async addModRole({ guild_id, role_id }: { guild_id: string; role_id: string }) {
        const roles = this.getServerModroles(guild_id).roles;
        if (!roles.includes(role_id)) roles.push(role_id);

        this._modRoles.set(guild_id, { guild_id, roles });
        await query(
            `REPLACE INTO ${DatabaseTables.ModRoles} ( roles, guild_id ) VALUES ( "${sqliseString(
                JSON.stringify(roles)
            )}", "${guild_id}" )`
        );

        return true;
    }
    public async removeModRole({ guild_id, role_id }: { guild_id: string; role_id: string }) {
        const roles = this.getServerModroles(guild_id).roles.filter((x) => x !== role_id);
        const has = this._modRoles.has(guild_id);

        this._modRoles.set(guild_id, { roles, guild_id });
        if (has) await query(
            `UPDATE ${DatabaseTables.ModRoles} SET roles="${sqliseString(JSON.stringify(roles))}" WHERE guild_id='${guild_id}'`
        );

        return true;
    }

    /*  End modroles part */
    /* Panels part */

    public async createPanel({
        guild,
        channel,
        subject,
        description,
        image,
        user
    }: createPanelOptions): Promise<{ embed: EmbedBuilder; panel?: ticketPanels }> {
        return new Promise(async (resolve) => {
            const embed = basicEmbed(guild.client.user)
                .setColor(guild.members.me.displayHexColor ?? util('accentColor'))
                .setTitle(subject)
                .setDescription(
                    `Créez un ticket en appuyant sur le bouton ci-dessous${description ? `\n\n${description}` : ''}`
                );

            if (image) embed.setThumbnail(image);
            const msg = (await channel
                .send({
                    embeds: [embed],
                    components: [
                        row(
                            buildButton({
                                label: 'Ouvrir un ticket',
                                emoji: '📥',
                                id: ticketButtonIds.Panel,
                                style: 'Primary'
                            })
                        )
                    ]
                })
                .catch(() => {})) as Message<true>;

            if (!msg)
                return resolve({
                    embed: this.panelNotFound(user, guild)
                });
            const data: ticketPanels<false> = {
                message_id: msg.id,
                image: image ?? '',
                description: description ?? '',
                subject,
                channel_id: channel.id,
                guild_id: guild.id
            };

            const res = await query(
                `INSERT INTO ${
                    DatabaseTables.Panels
                } ( guild_id, channel_id, message_id, image, description, subject ) VALUES ( '${guild.id}', '${
                    channel.id
                }', '${msg.id}', "${sqliseString(data.image)}", "${sqliseString(data.description)}", "${
                    data.subject
                }" )`
            );

            const id = res.insertId;
            this._panels.set(msg.id, {
                ...data,
                reference: id
            });

            return resolve({
                panel: this._panels.get(msg.id),
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Panel crée')
                    .setDescription(`Le panel a été crée dans le salon ${pingChan(channel)}`)
            });
        });
    }
    public deletePanel({
        guild,
        user,
        message_id
    }: deletePanelOptions): Promise<{ panel?: ticketPanels; embed: EmbedBuilder }> {
        return new Promise(async (resolve) => {
            const panel = this._panels.get(message_id);
            const channel = this.fetchPanelChannel({ guild, message_id });

            if (!channel)
                return resolve({
                    embed: basicEmbed(user)
                        .setColor(evokerColor(guild))
                        .setTitle('Salon invalide')
                        .setDescription(
                            `Je ne trouve pas le salon du panel.\nRéessayez dans quelques minutes.\n${hint(
                                `Si l'erreur persiste, vérifiez que j'ai la permissions **${getPerm(
                                    'ManageChannels'
                                )}**`
                            )}`
                        )
                });
            const message = await this.fetchPanelMessage({ channel, message_id });
            if (!message)
                return resolve({
                    embed: this.panelNotFound(user, guild)
                });

            if (message.deletable) message.delete().catch(() => {});
            console.log(await query(`DELETE FROM ${DatabaseTables.Panels} WHERE reference='${panel.reference}'`));
            message.delete().catch(() => {});
            this._panels.delete(message_id);

            return resolve({
                panel,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle('Panel supprimé')
                    .setDescription(`Le panel dans le salon ${pingChan(panel.channel_id)} a été supprimé`)
            });
        });
    }
    public getPanelsList(guild_id: string) {
        return this._panels.filter((x) => x.guild_id === guild_id);
    }

    /* End panels part */
    // Private methods to get components

    private get createComponents() {
        return row(...ticketsCreateButtons(true));
    }
    private get createComponentsNoMention() {
        return row(...ticketsCreateButtons(false));
    }
    private invalidChannel(user: User, guild: Guild) {
        return basicEmbed(user)
            .setTitle('Erreur de fermeture')
            .setDescription(
                `Je n'ai pas pu trouver le salon du ticket.\nAttendez quelques minutes, puis réessayez.\n${hint(
                    `Si l'erreur persiste, vérifiez que j'ai la permission **${getPerm('ManageChannels')}**`
                )}`
            )
            .setColor(evokerColor(guild));
    }
    private invalidMessage(user: User, guild: Guild) {
        return basicEmbed(user)
            .setTitle('Erreur de fermeture')
            .setDescription(
                `Je n'ai pas pu trouver le message du ticket.\nAttendez quelques minutes, puis réessayez.\n${hint(
                    `Si l'erreur persiste, vérifiez que j'ai la permission **${getPerm('ManageMessages')}**`
                )}`
            )
            .setColor(evokerColor(guild));
    }
    private panelNotFound(user: User, guild: Guild) {
        return basicEmbed(user)
            .setColor(evokerColor(guild))
            .setTitle('Panel introuvable')
            .setDescription(
                `Je ne trouve pas le panel.\nVous ne devriez pas voir ce message d'erreur si vous avez correctement configuré les permissions de Draver\n${hint(
                    `J'ai besoin de la permission **${getPerm('ManageMessages')}**`
                )}`
            );
    }

    // Public util methods

    public isTicket(message_id: string) {
        return this._tickets.has(message_id);
    }

    // Private util methods

    private findPanel({ panel_reference, guild }: { panel_reference: number; guild: string }) {
        return this._panels.find((x) => x.guild_id === guild && x.reference === panel_reference);
    }

    private fetchChannel(message_id: string, guild: Guild): TextChannel {
        const ticket = this._tickets.get(message_id);
        const channel = guild.channels.cache.get(ticket.channel_id);

        return channel as TextChannel;
    }
    private fetchMessage(message_id: string, channel: TextChannel): Message<true> {
        const ticket = this._tickets.get(message_id);
        
        return channel.messages.cache.get(ticket.message_id);
    }

    private generateTicketName(guild: string) {
        const tickets = this._tickets.filter((x) => x.guild_id === guild);
        const id = tickets.size + 1;

        const numberOfZeros = 4 - id.toString().length;
        return `ticket-${numberOfZeros > 1 ? new Array(numberOfZeros).fill('0').join('') : ''}${id}`;
    }
    private fetchPanelChannel({ guild, message_id }: { guild: Guild; message_id: string }): TextChannel {
        const panel = this._panels.get(message_id);
        const channel = guild.channels.cache.get(panel.channel_id);

        return channel as TextChannel;
    }
    private async fetchPanelMessage({ message_id, channel }: { message_id: string; channel: TextChannel }) {
        await channel.messages.fetch().catch(() => {});
        return channel.messages.cache.get(message_id);
    }

    // Private loading methods
    private fillTickets() {
        return new Promise(async (resolve) => {
            const datas = await query<ticketChannels>(`SELECT * FROM ${DatabaseTables.Tickets}`);
            this._tickets.clear();

            for (const data of datas) {
                this._tickets.set(data.message_id, data);
            }
            resolve(true);
        });
    }
    private fillPanels() {
        return new Promise(async (resolve) => {
            const datas = await query<ticketPanels>(`SELECT * FROM ${DatabaseTables.Panels}`);
            this._panels.clear();

            for (const data of datas) {
                this._panels.set(data.message_id, data);
            }
            resolve(true);
        });
    }
    private fillModRoles() {
        return new Promise(async (resolve) => {
            const datas = await query<ticketModRoles<false>>(`SELECT * FROM ${DatabaseTables.ModRoles}`);
            this._modRoles.clear();

            for (const data of datas) {
                this._modRoles.set(data.guild_id, {
                    ...data,
                    roles: JSON.parse(data.roles)
                });
            }
            resolve(true);
        });
    }
    private async fillCache() {
        await Promise.all([this.fillTickets(), this.fillPanels(), this.fillModRoles()]);
        return true;
    }
    private async checkDb() {
        await Promise.all([
            query(
                `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Tickets} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL PRIMARY KEY, panel_reference INTEGER(255) NOT NULL DEFAULT '-1', user_id VARCHAR(255) NOT NULL, state VARCHAR(255) NOT NULL DEFAULT 'open', channelName VARCHAR(255) NOT NULL )`
            ),
            query(
                `CREATE TABLE IF NOT EXISTS ${DatabaseTables.Panels} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, reference INTEGER(255) NOT NULL AUTO_INCREMENT PRIMARY KEY, image VARCHAR(255) NOT NULL DEFAULT '', description VARCHAR(255) NOT NULL DEFAULT '', subject VARCHAR(255) NOT NULL DEFAULT 'pas de sujet' )`
            ),
            query(
                `CREATE TABLE IF NOT EXISTS ${DatabaseTables.ModRoles} ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, roles JSON NOT NULL DEFAULT '[]' )`
            )
        ]);
        return false;
    }
    // Getter functions
    public get tickets() {
        return this._tickets;
    }
    public get panels() {
        return this._panels;
    }
    public get modRoles() {
        return this._modRoles;
    }

    // Event block
    private setEvent() {
        this.client.on('buttonInteraction', async (button) => {
            if (arrayfy(ticketButtonIds).includes(button.customId)) {
                if (!button.client.modulesManager.enabled(button.guild.id, 'tickets')) {
                    button
                        .reply({
                            embeds: [replies.moduleDisabled(button.user, { guild: button.guild, module: 'tickets' })],
                            ephemeral: true
                        })
                        .catch(() => {});
                    return;
                }
                switch (button.customId) {
                    case ticketButtonIds.Mention:
                        this.mentionEveryone(button.message.id, button.guild);
                        button.deferUpdate().catch(() => {});
                        break;
                    case ticketButtonIds.Close:
                        {
                            const confirmation = (await confirm({
                                interaction: button,
                                user: button.user,
                                embed: basicEmbed(button.user)
                                    .setTitle('Fermeture')
                                    .setDescription(`Voulez-vous fermer le ticket ?`),
                                ephemeral: true
                            }).catch(() => {})) as confirmReturn;

                            if (confirmation === 'cancel' || !confirmation?.value) {
                                button.editReply({ embeds: [replies.cancel()], components: [] }).catch(() => {});
                                return;
                            }

                            const rep = await this.closeTicket({
                                guild: button.guild,
                                user: button.user,
                                message_id: button.message.id
                            });
                            const ephemeral = !notNull(rep.ticket);

                            if (ephemeral) {
                                button.channel.send({
                                    embeds: [rep.embed]
                                });
                                button.deleteReply().catch(() => {});
                            } else {
                                button
                                    .editReply({
                                        embeds: [rep.embed],
                                        components: []
                                    })
                                    .catch(() => {});
                            }
                        }
                        break;
                    case ticketButtonIds.Delete:
                        {
                            const confirmation = (await confirm({
                                interaction: button,
                                user: button.user,
                                embed: basicEmbed(button.user)
                                    .setTitle('Suppression')
                                    .setDescription(`Voulez-vous supprimer le ticket ?`),
                                ephemeral: true
                            }).catch(() => {})) as confirmReturn;

                            if (confirmation === 'cancel' || !confirmation?.value) {
                                button.editReply({ embeds: [replies.cancel()], components: [] }).catch(() => {});
                                return;
                            }

                            const rep = await this.deleteTicket({
                                guild: button.guild,
                                user: button.user,
                                message_id: button.message.id
                            });
                            const ephemeral = !notNull(rep.ticket);

                            if (ephemeral) {
                                button.channel.send({
                                    embeds: [rep.embed]
                                });
                                button.deleteReply().catch(() => {});
                            } else {
                                button
                                    .editReply({
                                        embeds: [rep.embed],
                                        components: []
                                    })
                                    .catch(() => {});
                            }
                        }
                        break;
                    case ticketButtonIds.Panel:
                    case ticketButtonIds.Open:
                        {
                            const panel = this._panels.get(button.message.id);
                            const rep = await this.createTicket({
                                guild: button.guild,
                                panel_id: panel.reference,
                                user: button.user,
                                description: panel.description,
                                subject: panel.subject
                            });

                            button
                                .reply({
                                    embeds: [rep.embed],
                                    ephemeral: true
                                })
                                .catch(() => {});
                        }
                        break;
                    case ticketButtonIds.Reopen:
                        {
                            const confirmation = (await confirm({
                                interaction: button,
                                user: button.user,
                                embed: basicEmbed(button.user)
                                    .setTitle('Réouverture')
                                    .setDescription(`Voulez-vous réouvrir le ticket ?`),
                                ephemeral: true
                            }).catch(() => {})) as confirmReturn;

                            if (confirmation === 'cancel' || !confirmation?.value) {
                                button.editReply({ embeds: [replies.cancel()], components: [] }).catch(() => {});
                                return;
                            }

                            const rep = await this.reopenTicket({
                                guild: button.guild,
                                user: button.user,
                                message_id: button.message.id
                            });
                            const ephemeral = !notNull(rep.ticket);

                            if (ephemeral) {
                                button.channel.send({
                                    embeds: [rep.embed]
                                });
                                button.deleteReply().catch(() => {});
                            } else {
                                button.editReply({
                                    embeds: [rep.embed],
                                    components: []
                                });
                            }
                        }
                        break;
                    case ticketButtonIds.Save: {
                        await button.deferReply().catch(() => {});
                        const res = await this.saveTicket({
                            channel_id: button.channel.id,
                            guild: button.guild,
                            user: button.user
                        });

                        if (!res.id) {
                            button
                                .editReply({
                                    embeds: [res.embed]
                                })
                                .catch(() => {});
                            return;
                        }

                        const at = new AttachmentBuilder(`./dist/saves/${res.id}.html`)
                            .setName(`${button.channel.name}.html`)
                            .setDescription(
                                `Sauvegarde générée le ${new Date().toLocaleDateString(
                                    'fr'
                                )} à ${new Date().getHours()}:${new Date().getMinutes()}`
                            );
                        button
                            .editReply({
                                embeds: [res.embed],
                                files: [at]
                            })
                            .catch(console.log);
                    }
                }
            }
        });
    }
}
