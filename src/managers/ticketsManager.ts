import { ChannelType, Client, Collection, EmbedBuilder, Message, OverwriteResolvable, TextChannel } from "discord.js";
import { ticketChannels, ticketModRoles, ticketPanels, ticketState } from "../typings/database";
import query from "../utils/query";
import { closeTicketOptions, createTicketOptions, ticketsTable } from "../typings/managers";
import { basicEmbed, displayDate, evokerColor, hint, notNull, pingChan, pingUser, row, sqliseString } from "../utils/toolbox";
import { getPerm, util } from "../utils/functions";
import { ticketsClosedButtons, ticketsCreateButtons } from "../data/buttons";

export class TicketsManager {
    public readonly client: Client;

    private tickets: Collection<string, ticketChannels> = new Collection();
    private panels: Collection<string, ticketPanels> = new Collection();
    private modRoles: Collection<string, ticketModRoles<true>> = new Collection();

    constructor(client: Client) {
        this.client = client;
        this.start();
    }

    // Starting block
    private async start() {
        await this.checkDb();
        await this.fillCache();
    }

    // Public methods

    public createTicket({ guild, panel_id, user }: createTicketOptions): Promise<{ ticket?: ticketChannels, embed: EmbedBuilder }> {
        return new Promise(async(resolve) => {
            const userTicket = this.tickets.find(x => x.guild_id === guild.id && x.user_id === user.id);
            const hasRole = notNull(userTicket);

            if (hasRole) return resolve({
                embed: basicEmbed(user)
                    .setTitle("Ticket déjà crée")
                    .setDescription(`Vous avez déjà un ticket ouvert dans ${pingChan(userTicket.channel_id)}`)
                    .setColor(evokerColor(guild))
            });

            const roles = (this.modRoles.get(guild.id) ?? {} as ticketModRoles<true>).roles;
            const permissions = [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'SendTTSMessages', 'EmbedLinks', 'AttachFiles', 'UseApplicationCommands']
                }
            ];

            for (const role of roles) {
                permissions.push({
                    id: role,
                    allow: ['ViewChannel', 'SendMessages', 'SendTTSMessages', 'EmbedLinks', 'AttachFiles', 'UseApplicationCommands']
                });
            }

            const ticket = await guild.channels.create({
                name: this.generateTicketName(guild.id),
                topic: `Ticket de ${pingUser(user)}`,
                permissionOverwrites: permissions as OverwriteResolvable[],
                reason: `Ticket ouvert par ${user.id}`,
                type: ChannelType.GuildText
            }).catch(() => {}) as TextChannel;

            if (!ticket) return {
                embed: basicEmbed(user)
                    .setTitle("Salon non-crée")
                    .setDescription(`Le salon n'a pas pu être crée.\nContactez un administrateur du serveur pour lui faire part de cette erreur et pour vérifier que je possède bien la permission **${getPerm('ManageChannels')}**`)
                    .setColor(evokerColor(guild))
            }

            const panel = this.findPanel({ panel_reference: panel_id, guild: guild.id });

            const embed = basicEmbed(user)
                .setColor(guild.members.me.displayHexColor ?? util('accentColor'))
                .setTitle(panel.subject)
                .setDescription(`Ticket ouvert par ${pingUser(user)} ${displayDate()}${panel.description ? '\n' + panel.description : ''}`)
            
            if (panel.image?.length > 0) embed.setThumbnail(panel.image);

            const msg = await ticket.send({
                embeds: [embed],
                components: [ this.createComponents ],
                content: pingUser(user)
            }).catch(() => {}) as Message<true>;
            if (!msg) {
                ticket.delete().catch(() => {});
                return resolve({
                    embed: basicEmbed(user)
                        .setTitle("Message non-envoyé")
                        .setDescription(`La création du ticket a été annulé car je n'ai pas pu envoyer le message dans ce ticket`)
                        .setColor(evokerColor(guild))
                });
            }
            
            const ticketDatas = {
                channel_id: ticket.id,
                guild_id: guild.id,
                user_id: user.id,
                state: 'open' as ticketState,
                panel_reference: panel_id,
                message_id: msg.id,
                channelName: ticket.name
            };
            this.tickets.set(msg.id, ticketDatas);
            await query(`INSERT INTO ${ticketsTable.Tickets} ( guild_id, channel_id, user_id, message_id, user_id, panel_reference, state, channelName ) VALUES ( '${guild.id}', '${ticket.id}', '${user.id}',  '${msg.id}', '${user.id}', '${panel_id}', 'open', "${sqliseString(ticket.name)}" )`);

            return resolve({
                ticket: ticketDatas,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle("Ticket crée")
                    .setDescription(`Votre ticket a été crée dans ${pingChan(ticket)}`)
            });
        })
    }

    public closeTicket({ guild, user, message_id }: closeTicketOptions): Promise<{ embed: EmbedBuilder; ticket?: ticketChannels }> {
        const ticket = this.tickets.get(message_id);
        const panel = this.findPanel({ panel_reference: ticket.panel_reference, guild: guild.id });

        return new Promise(async(resolve) => {
            if (ticket.state === 'closed') return resolve({
                embed: basicEmbed(user)
                    .setTitle("Ticket fermé")
                    .setDescription(`Le ticket est déjà fermé`)
                    .setColor(evokerColor(guild))
            });

            const channel = guild.channels.cache.get(ticket.channel_id) as TextChannel;
            if (!channel) return resolve({
                embed: basicEmbed(user)
                    .setTitle("Erreur de fermeture")
                    .setDescription(`Je n'ai pas pu trouver le salon du ticket.\nAttendez quelques minutes, puis réessayez.\n${hint(`Si l'erreur persiste, vérifiez que j'ai la permission **${getPerm('ManageChannels')}**`)}`)
                    .setColor(evokerColor(guild))
            })
            const message = channel.messages.cache.get(message_id);
            if (!message) return resolve({
                embed: basicEmbed(user)
                    .setTitle("Erreur de fermeture")
                    .setDescription(`Je n'ai pas pu trouver le message du ticket.\nAttendez quelques minutes, puis réessayez.\n${hint(`Si l'erreur persiste, vérifiez que j'ai la permission **${getPerm('ManageMessages')}**`)}`)
                    .setColor(evokerColor(guild))
            })

            await Promise.all([
                channel.permissionOverwrites.edit(ticket.user_id, {
                    ViewChannel: false
                }).catch(() => {}),
                channel.setName(`${ticket.channelName}-closed`).catch(() => {}),
                message.edit({
                    components: [ row(...ticketsClosedButtons()) ]
                }).catch(() => {})
            ]).catch(() => {});

            this.tickets.set(ticket.message_id, {
                ...ticket,
                state: 'closed'
            });
            ticket.state = 'closed';

            await query(`REPLACE INTO ${ticketsTable.Tickets} ( state ) VALUES ( 'closed' ) WHERE message_id='${ticket.message_id}'`);
            return resolve({
                ticket,
                embed: basicEmbed(user, { defaultColor: true })
                    .setTitle("Ticket fermé")
                    .setDescription(`Le ticket de ${pingUser(ticket.user_id)} a été fermé`)
            });
        })
    }

    // Private methods to get components

    private get createComponents() {
        return row(...ticketsCreateButtons(true));
    }
    private get createComponentsNoMention() {
        return row(...ticketsCreateButtons(false));
    }

    // Private util methods

    private findPanel({ panel_reference, guild }: { panel_reference: number, guild: string }) {
        return this.panels.find(x => x.guild_id === guild && x.reference === panel_reference);
    }

    private generateTicketName(guild: string) {
        const tickets = this.tickets.filter(x => x.guild_id === guild);
        const id = tickets.size + 1;

        const numberOfZeros = 4 - id.toString().length;
        return `ticket-${numberOfZeros > 1 ? new Array(numberOfZeros).fill('0').join('') : ''}${id}`;
    }

    // Private loading methods
    private fillTickets() {
        return new Promise(async(resolve) => {
            const datas = await query<ticketChannels>(`SELECT * FROM ${ticketsTable.Tickets}`);
            this.tickets.clear();

            for (const data of datas) {
                this.tickets.set(data.message_id, data);
            }
            resolve(true);
        })
    }
    private fillPanels() {
        return new Promise(async(resolve) => {
            const datas = await query<ticketPanels>(`SELECT * FROM ${ticketsTable.Panels}`);
            this.panels.clear();

            for (const data of datas) {
                this.panels.set(data.message_id, data);
            }
            resolve(true);
        })
    }
    private fillModRoles() {
        return new Promise(async(resolve) => {
            const datas = await query<ticketModRoles<false>>(`SELECT * FROM ${ticketsTable.ModRoles}`);
            this.modRoles.clear();

            for (const data of datas) {
                this.modRoles.set(data.guild_id, {
                    ...data,
                    roles: JSON.parse(data.roles)
                });
            }
            resolve(true);
        })
    }
    private async fillCache() {
        await Promise.all([ this.fillTickets(), this.fillPanels(), this.fillModRoles() ]);
        return true;
    }
    private async checkDb() {
        await Promise.all([
            query(`CREATE TABLE IF NOT EXISTS ${ticketsTable.Tickets} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL PRIMARY KEY, panel_reference INTEGER(255) NOT NULL, user_id VARCHAR(255) NOT NULL, state VARCHAR(255) NOT NULL DEFAULT 'open' )`),
            query(`CREATE TABLE IF NOT EXISTS ${ticketsTable.Panels} ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, message_id VARCHAR(255) NOT NULL, reference INTEGER(255) NOT NULL AUTO_INCREMENT PRIMARY KEY, image VARCHAR(255) NOT NULL DEFAULT '', description VARCHAR(255) NOT NULL DEFAULT '', subject VARCHAR(255) NOT NULL DEFAULT 'pas de sujet' )`),
            query(`CREATE TABLE IF NOT EXISTS ${ticketsTable.ModRoles} ( guild_id VARCHAR(255) NOT NULL PRIMARY KEY, roles JSON NOT NULL DEFAULT '[]' )`)
        ]);
        return false;
    }
}