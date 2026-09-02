import { env } from './env.js';
const API_BASE = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20;
export class DiscordApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
async function botFetch(path, init) {
    return fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...init?.headers,
        },
    });
}
export async function exchangeCodeForToken(code) {
    const body = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.DISCORD_REDIRECT_URI,
    });
    const res = await fetch(`${API_BASE}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok)
        throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
    return res.json();
}
export async function fetchDiscordUser(accessToken) {
    const res = await fetch(`${API_BASE}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok)
        throw new Error(`Failed to fetch Discord user: ${res.status}`);
    return res.json();
}
export async function fetchUserGuilds(accessToken) {
    const res = await fetch(`${API_BASE}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        const message = res.status === 429
            ? 'Discord rate-limited this request. Please try again in a few seconds.'
            : `Failed to fetch user guilds: ${res.status}`;
        throw new DiscordApiError(res.status, message);
    }
    return res.json();
}
export async function fetchBotGuildIds() {
    const res = await botFetch('/users/@me/guilds');
    if (!res.ok)
        throw new Error(`Failed to fetch bot guilds: ${res.status}`);
    const guilds = (await res.json());
    return new Set(guilds.map((g) => g.id));
}
export function canManageGuild(guild) {
    return guild.owner || (BigInt(guild.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
}
export async function fetchGuildDetail(guildId) {
    const res = await botFetch(`/guilds/${guildId}?with_counts=true`);
    if (res.status === 404 || res.status === 403)
        return null;
    if (!res.ok)
        throw new Error(`Failed to fetch guild ${guildId}: ${res.status}`);
    return res.json();
}
// Text-capable channel types: text, announcement, voice-with-text, forum, thread variants.
const TEXT_CHANNEL_TYPES = new Set([0, 5, 15]);
export async function fetchGuildChannels(guildId) {
    const res = await botFetch(`/guilds/${guildId}/channels`);
    if (!res.ok)
        return [];
    const channels = (await res.json());
    return channels
        .filter((c) => TEXT_CHANNEL_TYPES.has(c.type))
        .sort((a, b) => a.position - b.position);
}
export async function fetchGuildChannelCount(guildId) {
    const res = await botFetch(`/guilds/${guildId}/channels`);
    if (!res.ok)
        return 0;
    const channels = (await res.json());
    return channels.length;
}
export async function fetchGuildRoleCount(guildId) {
    const res = await botFetch(`/guilds/${guildId}/roles`);
    if (!res.ok)
        return 0;
    const roles = (await res.json());
    return roles.length;
}
export function buildDiscordMessageBody(payload) {
    const allowed_mentions = {
        parse: payload.mentionEveryone ? ['everyone'] : [],
        roles: payload.mentionRoleIds ?? [],
        users: payload.mentionUserIds ?? [],
    };
    const components = payload.buttons && payload.buttons.length > 0
        ? [
            {
                type: 1,
                components: payload.buttons.slice(0, 5).map((b) => b.customId
                    ? {
                        type: 2,
                        style: b.style ?? 1,
                        label: b.label,
                        custom_id: b.customId,
                        ...(b.emoji ? { emoji: { name: b.emoji } } : {}),
                    }
                    : {
                        type: 2,
                        style: 5,
                        label: b.label,
                        url: b.url,
                        ...(b.emoji ? { emoji: { name: b.emoji } } : {}),
                    }),
            },
        ]
        : undefined;
    return {
        content: payload.content || undefined,
        embeds: payload.embed ? [payload.embed] : undefined,
        components,
        allowed_mentions,
    };
}
export async function sendChannelMessage(channelId, payload) {
    const res = await botFetch(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify(buildDiscordMessageBody(payload)),
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({})));
        throw new DiscordApiError(res.status, body.message ?? `Discord rejected the message (${res.status})`);
    }
    return res.json();
}
let cachedBotUserId = null;
export async function fetchBotUserId() {
    if (cachedBotUserId)
        return cachedBotUserId;
    const res = await botFetch('/users/@me');
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch bot identity');
    const user = (await res.json());
    cachedBotUserId = user.id;
    return user.id;
}
const VIEW_CHANNEL = 1n << 10n;
const SEND_MESSAGES = 1n << 11n;
const READ_MESSAGE_HISTORY = 1n << 16n;
const MANAGE_CHANNELS = 1n << 4n;
export async function createTicketChannel(guildId, opts) {
    const botUserId = await fetchBotUserId();
    const allowFullBits = VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY;
    const res = await botFetch(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: JSON.stringify({
            name: opts.name,
            type: 0,
            parent_id: opts.parentId,
            permission_overwrites: [
                { id: guildId, type: 0, deny: VIEW_CHANNEL.toString() }, // @everyone (role id === guild id)
                { id: opts.openerDiscordId, type: 1, allow: allowFullBits.toString() },
                { id: botUserId, type: 1, allow: (allowFullBits | MANAGE_CHANNELS).toString() },
            ],
        }),
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({})));
        throw new DiscordApiError(res.status, body.message ?? 'Failed to create ticket channel');
    }
    return res.json();
}
export async function setChannelMemberAccess(channelId, userId, grant) {
    if (grant) {
        await botFetch(`/channels/${channelId}/permissions/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                type: 1,
                allow: (VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY).toString(),
            }),
        });
    }
    else {
        await botFetch(`/channels/${channelId}/permissions/${userId}`, { method: 'DELETE' });
    }
}
export async function lockTicketChannel(channelId, openerDiscordId, locked) {
    await botFetch(`/channels/${channelId}/permissions/${openerDiscordId}`, {
        method: 'PUT',
        body: JSON.stringify({
            type: 1,
            allow: (VIEW_CHANNEL | READ_MESSAGE_HISTORY | (locked ? 0n : SEND_MESSAGES)).toString(),
            deny: locked ? SEND_MESSAGES.toString() : '0',
        }),
    });
}
export async function renameChannel(channelId, name) {
    const res = await botFetch(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to rename channel');
}
export async function deleteChannel(channelId) {
    const res = await botFetch(`/channels/${channelId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404)
        throw new DiscordApiError(res.status, 'Failed to delete channel');
}
export async function fetchGuildRoles(guildId) {
    const res = await botFetch(`/guilds/${guildId}/roles`);
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch roles');
    return res.json();
}
export async function fetchGuildMember(guildId, userId) {
    const res = await botFetch(`/guilds/${guildId}/members/${userId}`);
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch member');
    return res.json();
}
function highestRolePosition(roles, memberRoleIds) {
    const byId = new Map(roles.map((r) => [r.id, r.position]));
    return Math.max(0, ...memberRoleIds.map((id) => byId.get(id) ?? 0));
}
/**
 * Refuses to let the bot act on a member whose highest role outranks (or ties)
 * the bot's own highest role — mirrors Discord's own hierarchy rule so we fail
 * with a clear message instead of a confusing Discord 403.
 */
export async function assertCanModerate(guildId, targetUserId) {
    const [roles, botUserId] = [await fetchGuildRoles(guildId), await fetchBotUserId()];
    const [target, bot] = await Promise.all([
        fetchGuildMember(guildId, targetUserId),
        fetchGuildMember(guildId, botUserId),
    ]);
    if (!target)
        throw new DiscordApiError(404, 'That user is not a member of this server');
    if (!bot)
        throw new DiscordApiError(500, 'Could not resolve the bot\'s own member record');
    const targetPos = highestRolePosition(roles, target.roles);
    const botPos = highestRolePosition(roles, bot.roles);
    if (targetPos >= botPos) {
        throw new DiscordApiError(403, "GREEN LIGHT's role is not above that member's highest role — moderation refused");
    }
}
export async function timeoutMember(guildId, userId, minutes, reason) {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    const res = await botFetch(`/guilds/${guildId}/members/${userId}`, {
        method: 'PATCH',
        headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
        body: JSON.stringify({ communication_disabled_until: until }),
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to time out member');
}
export async function kickMember(guildId, userId, reason) {
    const res = await botFetch(`/guilds/${guildId}/members/${userId}`, {
        method: 'DELETE',
        headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to kick member');
}
export async function banMember(guildId, userId, reason, deleteMessageDays = 0) {
    const res = await botFetch(`/guilds/${guildId}/bans/${userId}`, {
        method: 'PUT',
        headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
        body: JSON.stringify({ delete_message_seconds: deleteMessageDays * 86_400 }),
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to ban member');
}
export async function unbanMember(guildId, userId, reason) {
    const res = await botFetch(`/guilds/${guildId}/bans/${userId}`, {
        method: 'DELETE',
        headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
    });
    if (!res.ok && res.status !== 404)
        throw new DiscordApiError(res.status, 'Failed to unban member');
}
export async function purgeMessages(channelId, messageIds) {
    if (messageIds.length === 1) {
        await botFetch(`/channels/${channelId}/messages/${messageIds[0]}`, { method: 'DELETE' });
        return;
    }
    const res = await botFetch(`/channels/${channelId}/messages/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ messages: messageIds }),
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to purge messages');
}
export async function fetchRecentMessageIds(channelId, limit) {
    const res = await botFetch(`/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`);
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch messages');
    const messages = (await res.json());
    return messages.map((m) => m.id);
}
export async function deleteMessage(channelId, messageId, reason) {
    const res = await botFetch(`/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
    });
    if (!res.ok && res.status !== 404)
        throw new DiscordApiError(res.status, 'Failed to delete message');
}
export async function fetchGuildRolesFull(guildId) {
    const res = await botFetch(`/guilds/${guildId}/roles`);
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch roles');
    return res.json();
}
/** Throws unless the given role sits below the bot's own highest role. */
export async function assertRoleBelowBot(guildId, roleId) {
    const [roles, botUserId] = [await fetchGuildRolesFull(guildId), await fetchBotUserId()];
    const bot = await fetchGuildMember(guildId, botUserId);
    if (!bot)
        throw new DiscordApiError(500, "Could not resolve the bot's own member record");
    const rolePos = roles.find((r) => r.id === roleId)?.position ?? 0;
    const botPos = highestRolePosition(roles, bot.roles);
    if (rolePos >= botPos) {
        throw new DiscordApiError(403, "That role is not below GREEN LIGHT's own highest role — action refused");
    }
}
export async function createGuildRole(guildId, opts) {
    const res = await botFetch(`/guilds/${guildId}/roles`, { method: 'POST', body: JSON.stringify(opts) });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to create role');
    return res.json();
}
export async function editGuildRole(guildId, roleId, patch) {
    const res = await botFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to edit role');
    return res.json();
}
export async function deleteGuildRole(guildId, roleId) {
    const res = await botFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404)
        throw new DiscordApiError(res.status, 'Failed to delete role');
}
export async function assignRole(guildId, userId, roleId) {
    const res = await botFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'PUT' });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to assign role');
}
export async function removeRole(guildId, userId, roleId) {
    const res = await botFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404)
        throw new DiscordApiError(res.status, 'Failed to remove role');
}
export async function fetchAllGuildChannels(guildId) {
    const res = await botFetch(`/guilds/${guildId}/channels`);
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch channels');
    const channels = (await res.json());
    return channels.sort((a, b) => a.position - b.position);
}
export async function createGuildChannel(guildId, opts) {
    const res = await botFetch(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name: opts.name, type: opts.type, parent_id: opts.parentId, topic: opts.topic }),
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to create channel');
    return res.json();
}
export async function updateChannel(channelId, patch) {
    const res = await botFetch(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to update channel');
    return res.json();
}
const SEND_MESSAGES_BIT = 1n << 11n;
export async function setChannelLocked(guildId, channelId, locked) {
    const res = await botFetch(`/channels/${channelId}/permissions/${guildId}`, {
        method: 'PUT',
        body: JSON.stringify({
            type: 0,
            deny: locked ? SEND_MESSAGES_BIT.toString() : '0',
            allow: locked ? '0' : SEND_MESSAGES_BIT.toString(),
        }),
    });
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to update channel lock');
}
export async function fetchGuildMembersPage(guildId, opts = {}) {
    const params = new URLSearchParams({ limit: String(opts.limit ?? 100) });
    if (opts.after)
        params.set('after', opts.after);
    const res = await botFetch(`/guilds/${guildId}/members?${params.toString()}`);
    if (!res.ok)
        throw new DiscordApiError(res.status, 'Failed to fetch members');
    return res.json();
}
