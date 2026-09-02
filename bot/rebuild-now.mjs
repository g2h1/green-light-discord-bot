// One-off script: wipes every channel/category on the bot's guild and rebuilds
// it from SERVER_STRUCTURE. Bypasses the Discord slash-command UI entirely —
// run this directly with node from the bot/ directory (same folder as dist/, .env).
//
//   node rebuild-now.mjs
//
import 'dotenv/config'
import { Client, GatewayIntentBits, ChannelType } from 'discord.js'
import { SERVER_STRUCTURE } from './dist/config/serverStructure.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.first()
    if (!guild) {
      console.error('Bot is not in any guild.')
      process.exit(1)
    }
    console.log(`Guild: ${guild.name} (${guild.id})`)

    const allChannels = [...guild.channels.cache.values()]
    const nonCategories = allChannels.filter((c) => c.type !== ChannelType.GuildCategory)
    const categories = allChannels.filter((c) => c.type === ChannelType.GuildCategory)

    let deleted = 0
    for (const channel of [...nonCategories, ...categories]) {
      try {
        await channel.delete('Server rebuild via rebuild-now.mjs')
        deleted++
        console.log(`Deleted: ${channel.name}`)
      } catch (err) {
        console.warn(`Could not delete ${channel.name}: ${err.message}`)
      }
    }
    console.log(`\nDeleted ${deleted} channel(s)/categor(y/ies). Building new structure...\n`)

    const staffRoleIds = guild.roles.cache
      .filter((r) => /staff|mod|admin/i.test(r.name) && !r.managed && r.id !== guild.roles.everyone.id)
      .map((r) => r.id)
    const proRole = guild.roles.cache.find((r) => /pro/i.test(r.name) && !r.managed)

    const STAFF_CATEGORIES = new Set(['STAFF', 'MODERATION', 'SYSTEM', 'DEVELOPMENT'])
    const PRO_CATEGORIES = new Set(['PRO VOICE'])

    function tierForCategory(name) {
      if (STAFF_CATEGORIES.has(name)) return 'staff'
      if (PRO_CATEGORIES.has(name)) return 'pro'
      return 'public'
    }
    function permissionsForTier(tier) {
      const everyone = guild.roles.everyone.id
      if (tier === 'public') return [{ id: everyone, allow: ['ViewChannel'] }]
      if (tier === 'pro') {
        const ov = [{ id: everyone, deny: ['ViewChannel'] }]
        if (proRole) ov.push({ id: proRole.id, allow: ['ViewChannel'] })
        return ov
      }
      const ov = [{ id: everyone, deny: ['ViewChannel'] }]
      for (const roleId of staffRoleIds) ov.push({ id: roleId, allow: ['ViewChannel'] })
      return ov
    }

    for (const plan of SERVER_STRUCTURE) {
      const tier = tierForCategory(plan.category)
      const overwrites = permissionsForTier(tier)
      const category = await guild.channels.create({
        name: plan.category,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
      })
      console.log(`Created category: ${plan.category}`)
      for (const ch of plan.channels) {
        await guild.channels.create({ name: ch.name, type: ch.type, parent: category.id })
        console.log(`  Created channel: ${ch.name}`)
      }
    }

    console.log('\nDone. Rebuild complete.')
    process.exit(0)
  } catch (err) {
    console.error('Rebuild failed:', err)
    process.exit(1)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
