import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import * as ping from './commands/ping.js'

export interface Command {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export const commands: Command[] = [ping as Command]
export const commandsByName = new Map(commands.map((c) => [c.data.name, c]))
