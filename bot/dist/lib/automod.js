import { getServerSetting } from './serverSettings.js';
import { logEvent } from './logging.js';
import { supabase } from './supabase.js';
const DEFAULTS = {
    antiSpam: false,
    antiFlood: false,
    linkFilter: false,
    badWordFilter: false,
    mentionSpam: false,
    duplicateMessage: false,
    capsDetection: false,
    bannedWords: [],
};
const SPAM_WINDOW_MS = 6_000;
const SPAM_MESSAGE_LIMIT = 5;
const MENTION_LIMIT = 5;
const DUPLICATE_THRESHOLD = 3;
const CAPS_MIN_LENGTH = 12;
const CAPS_RATIO_THRESHOLD = 0.7;
const recentMessages = new Map(); // userId -> timestamps, for anti-spam/flood
const lastMessageByUser = new Map(); // userId -> last content + streak
const URL_REGEX = /https?:\/\/\S+/i;
function violation(config, message) {
    const content = message.content;
    if (config.linkFilter && URL_REGEX.test(content))
        return 'link_filter';
    if (config.badWordFilter && config.bannedWords.length > 0) {
        const lower = content.toLowerCase();
        if (config.bannedWords.some((w) => w && lower.includes(w.toLowerCase())))
            return 'bad_word_filter';
    }
    if (config.mentionSpam && message.mentions.users.size + message.mentions.roles.size > MENTION_LIMIT) {
        return 'mention_spam';
    }
    if (config.capsDetection && content.length >= CAPS_MIN_LENGTH) {
        const letters = content.replace(/[^a-zA-Z]/g, '');
        const upper = content.replace(/[^A-Z]/g, '');
        if (letters.length > 0 && upper.length / letters.length >= CAPS_RATIO_THRESHOLD)
            return 'caps_detection';
    }
    if (config.duplicateMessage) {
        const last = lastMessageByUser.get(message.author.id);
        if (last && last.content === content) {
            last.count += 1;
            lastMessageByUser.set(message.author.id, last);
            if (last.count >= DUPLICATE_THRESHOLD)
                return 'duplicate_message';
        }
        else {
            lastMessageByUser.set(message.author.id, { content, count: 1 });
        }
    }
    if (config.antiSpam || config.antiFlood) {
        const now = Date.now();
        const timestamps = (recentMessages.get(message.author.id) ?? []).filter((t) => now - t < SPAM_WINDOW_MS);
        timestamps.push(now);
        recentMessages.set(message.author.id, timestamps);
        if (timestamps.length > SPAM_MESSAGE_LIMIT)
            return config.antiFlood ? 'anti_flood' : 'anti_spam';
    }
    return null;
}
export async function checkAutomod(message) {
    if (message.author.bot || !message.guildId || !message.guild)
        return;
    const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_guild_id', message.guildId)
        .maybeSingle();
    if (!server)
        return;
    const config = await getServerSetting(server.id, 'automod', DEFAULTS);
    const reason = violation(config, message);
    if (!reason)
        return;
    await message.delete().catch(() => undefined);
    await logEvent(message.guild, 'security', reason, `AutoMod (${reason.replace('_', ' ')}) removed a message from ${message.author.tag} in #${'name' in message.channel ? message.channel.name : message.channelId}.`, { userId: message.author.id, channelId: message.channelId });
}
