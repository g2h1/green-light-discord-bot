import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import * as ping from './commands/ping.js'
import * as server from './commands/server.js'
import * as support from './commands/support.js'
import * as ticketpanel from './commands/ticketpanel.js'

export interface Command {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export const commands: Command[] = [ping, server, support, ticketpanel] as Command[]
export const commandsByName = new Map(commands.map((c) => [c.data.name, c]))
