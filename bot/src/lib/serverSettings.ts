import { supabase } from './supabase.js'

export async function getServerSetting<T>(serverRowId: string, key: string, fallback: T): Promise<T> {
  const { data } = await supabase
    .from('server_settings')
    .select('value')
    .eq('server_id', serverRowId)
    .eq('key', key)
    .maybeSingle()

  return data ? (data.value as T) : fallback
}
