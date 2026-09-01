import type { Client } from 'discord.js'

export function registerReady(client: Client) {
  client.once('clientReady', (c) => {
    console.log(`Bot logged in as ${c.user.tag}, serving ${c.guilds.cache.size} guild(s).`)
  })
}
