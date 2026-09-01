import type { Client } from 'discord.js'
import { logTicketMessage } from '../lib/tickets.js'
import { checkAutomod } from '../lib/automod.js'
import { checkStrictChannel } from '../lib/strictChannels.js'

export function registerMessageCreate(client: Client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guildId) return

    const handled = await checkStrictChannel(message)
    if (handled) return

    await checkAutomod(message)
    await logTicketMessage(message.channelId, message.author.id, message.author.username, message.content)
  })
}
