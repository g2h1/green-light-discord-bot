import { randomUUID } from 'node:crypto';
import { supabase } from './supabase.js';
import { HttpError } from '../middleware/errorHandler.js';
const BUCKET = 'panel-assets';
const MAX_BYTES = 8 * 1024 * 1024; // 8MB, matches the bucket's own fileSizeLimit
// Sniff real file signatures rather than trusting the client-supplied MIME
// type or filename extension — a renamed .exe with a fake "image/png"
// Content-Type header would otherwise sail straight through.
const SIGNATURES = [
    { ext: 'png', mime: 'image/png', check: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
    { ext: 'jpg', mime: 'image/jpeg', check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    {
        ext: 'webp',
        mime: 'image/webp',
        check: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
    },
    { ext: 'gif', mime: 'image/gif', check: (b) => b.length > 6 && (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a') },
];
function detectImageType(buffer) {
    return SIGNATURES.find((sig) => sig.check(buffer));
}
export async function uploadPanelImage(panelId, field, file) {
    if (file.size > MAX_BYTES) {
        throw new HttpError(400, `File too large (max ${MAX_BYTES / 1024 / 1024}MB)`);
    }
    const detected = detectImageType(file.buffer);
    if (!detected) {
        throw new HttpError(400, 'Unsupported or unrecognized file type. Allowed: PNG, JPG, WEBP, GIF.');
    }
    const path = `ticket-panels/${panelId}/${field}/${randomUUID()}.${detected.ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
        contentType: detected.mime,
        cacheControl: '3600',
        upsert: false,
    });
    if (error)
        throw new HttpError(500, `Upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}
/**
 * Conservative cleanup: only ever called for a URL we just confirmed is no
 * longer referenced by any panel (see routes/tickets.ts), and only deletes
 * from our own bucket path — never touches anything else in storage, and
 * never runs automatically on every save (only on explicit remove).
 */
export async function deletePanelImageIfOwned(url) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1)
        return; // not one of our uploaded assets (e.g. a manually-entered external URL) — leave it alone
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
}
/** Called only when the whole panel row is deleted — safe to remove everything under its own path. */
export async function deleteAllPanelImages(panelId) {
    for (const field of ['image', 'thumbnail']) {
        const prefix = `ticket-panels/${panelId}/${field}`;
        const { data: files } = await supabase.storage.from(BUCKET).list(prefix);
        if (files && files.length > 0) {
            await supabase.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`)).catch(() => undefined);
        }
    }
}
