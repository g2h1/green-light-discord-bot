import { EmbedBuilder } from 'discord.js';
import { supabase } from './supabase.js';
import { getServerSetting } from './serverSettings.js';
import { getOrCreateServerRow } from './serverStore.js';
const ACTION_COLOR = {
    warn: 0xf5a524,
    timeout: 0xf5a524,
    kick: 0xf31260,
    ban: 0xf31260,
    unban: 0x17c964,
    purge: 0x71717a,
    delete_message: 0x71717a,
};
/**
 * Mirrors backend/src/lib/moderationLog.ts so bot-initiated actions (e.g. Strict
 * Channel Protection) land in the exact same moderation_logs table and log
 * channel as dashboard-initiated ones — one moderation log, two producers.
 */
export async function recordModerationAction(guild, opts) {
    const server = await getOrCreateServerRow(guild);
    await supabase.from('moderation_logs').insert({
        server_id: server.id,
        action: opts.action,
        target_discord_id: opts.targetDiscordId ?? null,
        moderator_discord_id: opts.moderatorDiscordId,
        reason: opts.reason ?? null,
        metadata: opts.metadata ?? {},
    });
    const channels = await getServerSetting(server.id, 'log_channels', {});
    const channelId = channels.moderation_logs;
    if (!channelId)
        return;
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased())
        return;
    const embed = new EmbedBuilder()
        .setTitle(`Moderation: ${opts.action.replace('_', ' ')}`)
        .setColor(ACTION_COLOR[opts.action])
        .setTimestamp();
    const fields = [];
    if (opts.targetDiscordId)
        fields.push({ name: 'Target', value: `<@${opts.targetDiscordId}>`, inline: true });
    fields.push({ name: 'Moderator', value: `<@${opts.moderatorDiscordId}>`, inline: true });
    if (opts.reason)
        fields.push({ name: 'Reason', value: opts.reason });
    embed.addFields(fields);
    await channel.send({ embeds: [embed] }).catch(() => undefined);
}
