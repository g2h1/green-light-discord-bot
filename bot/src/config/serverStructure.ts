import { ChannelType } from 'discord.js';

interface ServerStructureCategory {
  category: string;
  channels: Array<{ name: string; type: ChannelType.GuildText | ChannelType.GuildVoice }>;
}

export const SERVER_STRUCTURE: ServerStructureCategory[] = [
  {
    category: "START HERE",
    channels: [
      { name: "rules", type: ChannelType.GuildText },
      { name: "welcome", type: ChannelType.GuildText },
      { name: "announcements", type: ChannelType.GuildText },
      { name: "updates", type: ChannelType.GuildText },
      { name: "status", type: ChannelType.GuildText },
      { name: "faq", type: ChannelType.GuildText },
      { name: "official-links", type: ChannelType.GuildText },
    ]
  },
  {
    category: "COMMUNITY",
    channels: [
      { name: "general", type: ChannelType.GuildText },
      { name: "introductions", type: ChannelType.GuildText },
      { name: "creator-chat", type: ChannelType.GuildText },
      { name: "creator-growth", type: ChannelType.GuildText },
      { name: "ideas", type: ChannelType.GuildText },
      { name: "networking", type: ChannelType.GuildText },
      { name: "showcase", type: ChannelType.GuildText },
    ]
  },
  {
    category: "AI & PRODUCT",
    channels: [
      { name: "ai-analyzer", type: ChannelType.GuildText },
      { name: "ai-negotiator", type: ChannelType.GuildText },
      { name: "trust-score", type: ChannelType.GuildText },
      { name: "product-testing", type: ChannelType.GuildText },
      { name: "product-feedback", type: ChannelType.GuildText },
      { name: "product-bugs", type: ChannelType.GuildText },
    ]
  },
  {
    category: "SUPPORT CENTER",
    channels: [
      { name: "open-ticket", type: ChannelType.GuildText },
      { name: "support-info", type: ChannelType.GuildText },
      { name: "bug-reports", type: ChannelType.GuildText },
      { name: "feature-requests", type: ChannelType.GuildText },
      { name: "billing-support", type: ChannelType.GuildText },
      { name: "account-help", type: ChannelType.GuildText },
      { name: "ai-support", type: ChannelType.GuildText },
      { name: "security-support", type: ChannelType.GuildText },
      { name: "technical-status", type: ChannelType.GuildText },
    ]
  },
  {
    category: "BILLING",
    channels: [
      { name: "plus", type: ChannelType.GuildText },
      { name: "pro", type: ChannelType.GuildText },
      { name: "billing-info", type: ChannelType.GuildText },
      { name: "payment-help", type: ChannelType.GuildText },
      { name: "promotions", type: ChannelType.GuildText },
    ]
  },
  {
    category: "EVENTS",
    channels: [
      { name: "giveaways", type: ChannelType.GuildText },
      { name: "events", type: ChannelType.GuildText },
      { name: "community-events", type: ChannelType.GuildText },
      { name: "leaderboard", type: ChannelType.GuildText },
    ]
  },
  {
    category: "COMMUNITY VOICE",
    channels: [
      { name: "Lounge 1", type: ChannelType.GuildVoice },
      { name: "Lounge 2", type: ChannelType.GuildVoice },
      { name: "Chill Room", type: ChannelType.GuildVoice },
      { name: "Gaming Room", type: ChannelType.GuildVoice },
      { name: "Creator Lounge", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "GAMING VOICE",
    channels: [
      { name: "Gaming 1", type: ChannelType.GuildVoice },
      { name: "Gaming 2", type: ChannelType.GuildVoice },
      { name: "Gaming 3", type: ChannelType.GuildVoice },
      { name: "Squad Room 1", type: ChannelType.GuildVoice },
      { name: "Squad Room 2", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "CREATOR VOICE",
    channels: [
      { name: "Creator Room 1", type: ChannelType.GuildVoice },
      { name: "Creator Room 2", type: ChannelType.GuildVoice },
      { name: "Recording Room", type: ChannelType.GuildVoice },
      { name: "Collab Room", type: ChannelType.GuildVoice },
      { name: "Podcast Room", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "PRO VOICE",
    channels: [
      { name: "Pro Lounge", type: ChannelType.GuildVoice },
      { name: "Pro Room 1", type: ChannelType.GuildVoice },
      { name: "Pro Room 2", type: ChannelType.GuildVoice },
      { name: "Pro Creator Room", type: ChannelType.GuildVoice },
      { name: "Private Pro", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "SUPPORT VOICE",
    channels: [
      { name: "Support Waiting", type: ChannelType.GuildVoice },
      { name: "Support Room 1", type: ChannelType.GuildVoice },
      { name: "Support Room 2", type: ChannelType.GuildVoice },
      { name: "Technical Support", type: ChannelType.GuildVoice },
      { name: "Billing Support", type: ChannelType.GuildVoice },
      { name: "Private Support", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "STAFF",
    channels: [
      { name: "staff-chat", type: ChannelType.GuildText },
      { name: "staff-tasks", type: ChannelType.GuildText },
      { name: "staff-announcements", type: ChannelType.GuildText },
      { name: "internal-bugs", type: ChannelType.GuildText },
      { name: "incidents", type: ChannelType.GuildText },
      { name: "staff-analytics", type: ChannelType.GuildText },
    ]
  },
  {
    category: "MODERATION",
    channels: [
      { name: "mod-logs", type: ChannelType.GuildText },
      { name: "warnings", type: ChannelType.GuildText },
      { name: "security-alerts", type: ChannelType.GuildText },
      { name: "automod-logs", type: ChannelType.GuildText },
    ]
  },
  {
    category: "SYSTEM",
    channels: [
      { name: "bot-logs", type: ChannelType.GuildText },
      { name: "member-logs", type: ChannelType.GuildText },
      { name: "ticket-logs", type: ChannelType.GuildText },
      { name: "message-logs", type: ChannelType.GuildText },
      { name: "server-logs", type: ChannelType.GuildText },
      { name: "security-logs", type: ChannelType.GuildText },
    ]
  },
  {
    category: "DEVELOPMENT",
    channels: [
      { name: "dev-chat", type: ChannelType.GuildText },
      { name: "dev-bugs", type: ChannelType.GuildText },
      { name: "testing", type: ChannelType.GuildText },
      { name: "releases", type: ChannelType.GuildText },
      { name: "changelog", type: ChannelType.GuildText },
    ]
  }
];
