import { supabase } from './supabase.js'
import { fetchGuildDetail } from './discord.js'
import { HttpError } from '../middleware/errorHandler.js'

/** Resolves a Discord guild id to its internal `servers` row, creating it if needed. */
export async function getOrCreateServerRow(discordGuildId: string) {
  const { data: existing } = await supabase
    .from('servers')
    .select('id, discord_guild_id, name, icon')
    .eq('discord_guild_id', discordGuildId)
    .maybeSingle()

  if (existing) return existing

  const detail = await fetchGuildDetail(discordGuildId)
  if (!detail) throw new HttpError(404, 'GREEN LIGHT is not installed on this server yet')

  const { data: created, error } = await supabase
    .from('servers')
    .insert({ discord_guild_id: detail.id, name: detail.name, icon: detail.icon })
    .select('id, discord_guild_id, name, icon')
    .single()

  if (error || !created) throw error ?? new Error('Failed to create server row')
  return created
}
