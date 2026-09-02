import { supabase } from './supabase.js';
import { getServerSetting } from './serverSettings.js';
import { sendChannelMessage } from './discord.js';
const ACTION_COLOR = {
    warn: 0xf5a524,
    timeout: 0xf5a524,
    kick: 0xf31260,
    ban: 0xf31260,
    unban: 0x17c964,
    purge: 0x71717a,
    delete_message: 0x71717a,
};
export async function recordModerationAction(serverRowId, opts) {
    await supabase.from('moderation_logs').insert({
        server_id: serverRowId,
        action: opts.action,
        target_discord_id: opts.targetDiscordId ?? null,
        moderator_discord_id: opts.moderatorDiscordId,
        reason: opts.reason ?? null,
        metadata: opts.metadata ?? {},
    });
    const channels = await getServerSetting(serverRowId, 'log_channels', {});
    const channelId = channels.moderation_logs;
    if (!channelId)
        return;
    const embed = {
        title: `Moderation: ${opts.action.replace('_', ' ')}`,
        color: ACTION_COLOR[opts.action],
        fields: [
            ...(opts.targetDiscordId ? [{ name: 'Target', value: `<@${opts.targetDiscordId}>`, inline: true }] : []),
            { name: 'Moderator', value: `<@${opts.moderatorDiscordId}>`, inline: true },
            ...(opts.reason ? [{ name: 'Reason', value: opts.reason }] : []),
        ],
        timestamp: new Date().toISOString(),
    };
    await sendChannelMessage(channelId, { embed }).catch((err) => console.error('Failed to post moderation log message:', err));
}
