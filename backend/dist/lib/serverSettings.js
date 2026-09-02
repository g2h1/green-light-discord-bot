import { supabase } from './supabase.js';
export async function getServerSetting(serverId, key, fallback) {
    const { data } = await supabase
        .from('server_settings')
        .select('value')
        .eq('server_id', serverId)
        .eq('key', key)
        .maybeSingle();
    return data ? data.value : fallback;
}
export async function setServerSetting(serverId, key, value) {
    const { error } = await supabase
        .from('server_settings')
        .upsert({ server_id: serverId, key, value }, { onConflict: 'server_id,key' });
    if (error)
        throw error;
}
