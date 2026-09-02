import { supabase } from './supabase.js';
import { sendChannelMessage } from './discord.js';
const POLL_INTERVAL_MS = 30_000;
const RECURRENCE_MINUTES = {
    daily: 24 * 60,
    weekly: 7 * 24 * 60,
};
async function dispatchDue() {
    const { data: due, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('send_at', new Date().toISOString());
    if (error) {
        console.error('Failed to poll scheduled_messages:', error);
        return;
    }
    for (const row of (due ?? [])) {
        try {
            await sendChannelMessage(row.channel_id, {
                content: row.content ?? undefined,
                embed: row.embed ?? undefined,
                buttons: row.buttons,
                mentionEveryone: row.mentions.everyone,
                mentionRoleIds: row.mentions.roles,
                mentionUserIds: row.mentions.users,
            });
            const intervalMinutes = row.recurrence === 'custom' ? row.recurrence_interval_minutes : RECURRENCE_MINUTES[row.recurrence];
            if (intervalMinutes) {
                const nextSendAt = new Date(new Date(row.send_at).getTime() + intervalMinutes * 60_000);
                await supabase.from('scheduled_messages').update({ send_at: nextSendAt.toISOString() }).eq('id', row.id);
            }
            else {
                await supabase.from('scheduled_messages').update({ status: 'sent' }).eq('id', row.id);
            }
        }
        catch (err) {
            console.error(`Failed to send scheduled message ${row.id}:`, err);
            await supabase
                .from('scheduled_messages')
                .update({ status: 'failed', last_error: err instanceof Error ? err.message : String(err) })
                .eq('id', row.id);
        }
    }
}
async function pickRandomWinners(giveawayId, count) {
    const { data: entries } = await supabase.from('giveaway_entries').select('discord_user_id').eq('giveaway_id', giveawayId);
    const pool = (entries ?? []).map((e) => e.discord_user_id);
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
}
async function endDueGiveaways() {
    const { data: due, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('status', 'active')
        .lte('ends_at', new Date().toISOString());
    if (error) {
        console.error('Failed to poll giveaways:', error);
        return;
    }
    for (const row of (due ?? [])) {
        try {
            const winners = await pickRandomWinners(row.id, row.winners_count);
            await sendChannelMessage(row.channel_id, {
                embed: {
                    title: `🎉 Giveaway ended: ${row.prize}`,
                    description: winners.length > 0
                        ? `Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}!`
                        : 'No one entered this giveaway.',
                    color: 0x17c964,
                },
            });
            await supabase
                .from('giveaways')
                .update({ status: 'ended', winner_discord_ids: winners })
                .eq('id', row.id);
        }
        catch (err) {
            console.error(`Failed to end giveaway ${row.id}:`, err);
        }
    }
}
export function startScheduler() {
    const timer = setInterval(() => {
        dispatchDue().catch((err) => console.error('Scheduler tick failed:', err));
        endDueGiveaways().catch((err) => console.error('Giveaway scheduler tick failed:', err));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
}
