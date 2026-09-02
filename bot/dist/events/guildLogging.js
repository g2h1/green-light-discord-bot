import { logEvent } from '../lib/logging.js';
import { getServerSetting } from '../lib/serverSettings.js';
import { supabase } from '../lib/supabase.js';
const RAID_WINDOW_MS = 10_000;
const RAID_JOIN_THRESHOLD = 5;
const recentJoins = new Map(); // guildId -> timestamps
async function checkAntiRaid(guild) {
    const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_guild_id', guild.id)
        .maybeSingle();
    if (!server)
        return;
    const automod = await getServerSetting(server.id, 'automod', { antiRaid: false });
    if (!automod.antiRaid)
        return;
    const now = Date.now();
    const timestamps = (recentJoins.get(guild.id) ?? []).filter((t) => now - t < RAID_WINDOW_MS);
    timestamps.push(now);
    recentJoins.set(guild.id, timestamps);
    if (timestamps.length === RAID_JOIN_THRESHOLD) {
        await logEvent(guild, 'security', 'anti_raid', `Possible raid detected: ${RAID_JOIN_THRESHOLD}+ members joined within ${RAID_WINDOW_MS / 1000}s.`, {});
    }
}
export function registerGuildLogging(client) {
    client.on('guildMemberAdd', (member) => {
        void logEvent(member.guild, 'member', 'member_join', `${member.user.tag} joined the server.`, {
            userId: member.id,
        });
        void checkAntiRaid(member.guild);
    });
    client.on('guildMemberRemove', (member) => {
        void logEvent(member.guild, 'member', 'member_leave', `${member.user.tag} left the server.`, {
            userId: member.id,
        });
    });
    client.on('guildMemberUpdate', (before, after) => {
        if (!before.premiumSince && after.premiumSince) {
            void logEvent(after.guild, 'member', 'server_boost', `${after.user.tag} boosted the server.`, {
                userId: after.id,
            });
        }
    });
    client.on('guildBanAdd', (ban) => {
        void logEvent(ban.guild, 'moderation', 'ban', `${ban.user.tag} was banned.`, { userId: ban.user.id });
    });
    client.on('guildBanRemove', (ban) => {
        void logEvent(ban.guild, 'moderation', 'unban', `${ban.user.tag} was unbanned.`, { userId: ban.user.id });
    });
    client.on('messageDelete', (message) => {
        if (!message.guild || message.author?.bot)
            return;
        void logEvent(message.guild, 'message', 'message_delete', `Message by ${message.author?.tag ?? 'unknown'} deleted in #${'name' in message.channel ? message.channel.name : message.channelId}.`, { authorId: message.author?.id, channelId: message.channelId, content: message.content?.slice(0, 500) });
    });
    client.on('messageUpdate', (before, after) => {
        if (!after.guild || after.author?.bot || before.content === after.content)
            return;
        void logEvent(after.guild, 'message', 'message_edit', `Message by ${after.author?.tag ?? 'unknown'} edited.`, {
            authorId: after.author?.id,
            channelId: after.channelId,
            before: before.content?.slice(0, 500),
            after: after.content?.slice(0, 500),
        });
    });
    client.on('roleCreate', (role) => {
        void logEvent(role.guild, 'role', 'role_created', `Role "${role.name}" was created.`, { roleId: role.id });
    });
    client.on('roleDelete', (role) => {
        void logEvent(role.guild, 'role', 'role_deleted', `Role "${role.name}" was deleted.`, { roleId: role.id });
    });
    client.on('channelCreate', (channel) => {
        if (!channel.guild)
            return;
        void logEvent(channel.guild, 'channel', 'channel_created', `Channel "${channel.name}" was created.`, {
            channelId: channel.id,
        });
    });
    client.on('channelDelete', (channel) => {
        if (!('guild' in channel) || !channel.guild)
            return;
        void logEvent(channel.guild, 'channel', 'channel_deleted', `Channel "${channel.name}" was deleted.`, {
            channelId: channel.id,
        });
    });
}
