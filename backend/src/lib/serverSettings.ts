import { supabase } from './supabase.js'

export async function getServerSetting<T>(serverId: string, key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from('server_settings')
    .select('value')
    .eq('server_id', serverId)
    .eq('key', key)
    .maybeSingle()

  return data ? (data.value as T) : fallback
}

export async function setServerSetting(serverId: string, key: string, value: unknown) {
  const { error } = await supabase
    .from('server_settings')
    .upsert({ server_id: serverId, key, value }, { onConflict: 'server_id,key' })

  if (error) throw error
}
