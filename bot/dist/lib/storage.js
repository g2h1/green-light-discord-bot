import { supabase } from './supabase.js';
const BUCKET = 'ticket-panel-assets';
const MAX_BYTES = 8 * 1024 * 1024;
/**
 * Downloads a Discord CDN attachment and re-uploads it to Supabase Storage so the
 * URL doesn't rot when the original Discord message/attachment expires or is deleted.
 * Returns the storage object path to persist on the panel row (not a Discord URL).
 */
export async function uploadPanelAsset(serverId, panelId, slot, attachmentUrl, contentType) {
    const res = await fetch(attachmentUrl);
    if (!res.ok)
        throw new Error(`Failed to fetch attachment (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES)
        throw new Error('Image exceeds the 8MB limit');
    const ext = extensionFromContentType(contentType) ?? extensionFromUrl(attachmentUrl) ?? 'png';
    const path = `${serverId}/${panelId}/${slot}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: contentType ?? 'application/octet-stream',
        upsert: true,
    });
    if (error)
        throw error;
    return path;
}
export async function removePanelAsset(path) {
    await supabase.storage.from(BUCKET).remove([path]);
}
/** Signed URL for previewing/rendering an asset — never a public/permanent link. */
export async function getPanelAssetUrl(path, expiresInSeconds = 3600) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error || !data)
        return null;
    return data.signedUrl;
}
function extensionFromContentType(contentType) {
    switch (contentType) {
        case 'image/png':
            return 'png';
        case 'image/jpeg':
            return 'jpg';
        case 'image/webp':
            return 'webp';
        case 'image/gif':
            return 'gif';
        default:
            return null;
    }
}
function extensionFromUrl(url) {
    const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(url);
    return match?.[1]?.toLowerCase() ?? null;
}
