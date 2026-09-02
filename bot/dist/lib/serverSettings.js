import { supabase } from './supabase.js';
export async function getServerSetting(serverRowId, key, fallback) {
    const { data } = await supabase
        .from('server_settings')
        .select('value')
        .eq('server_id', serverRowId)
        .eq('key', key)
        .maybeSingle();
    return data ? data.value : fallback;
}
