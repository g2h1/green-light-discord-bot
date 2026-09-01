import type { Guild } from 'discord.js'
import { supabase } from './supabase.js'

/** Resolves a Discord guild to its internal `servers` row, creating it if needed. */
export async function getOrCreateServerRow(guild: Guild) {
  const { data: existing } = await supabase
    .from('servers')
    .select('id, discord_guild_id')
    .eq('discord_guild_id', guild.id)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('servers')
    .insert({ discord_guild_id: guild.id, name: guild.name, icon: guild.icon })
    .select('id, discord_guild_id')
    .single()

  if (error || !created) throw error ?? new Error('Failed to create server row')
  return created
}
