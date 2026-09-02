import { ChannelType } from 'discord.js';

interface ServerStructureCategory {
  category: string;
  channels: Array<{ name: string; type: ChannelType.GuildText | ChannelType.GuildVoice }>;
}

export const SERVER_STRUCTURE: ServerStructureCategory[] = [
  {
    category: "INFO",
    channels: [
      { name: "rules", type: ChannelType.GuildText },
      { name: "announcements", type: ChannelType.GuildText },
      { name: "updates", type: ChannelType.GuildText },
      { name: "faq", type: ChannelType.GuildText },
    ]
  },
  {
    category: "COMMUNITY",
    channels: [
      { name: "general", type: ChannelType.GuildText },
      { name: "introductions", type: ChannelType.GuildText },
      { name: "ideas", type: ChannelType.GuildText },
      { name: "showcase", type: ChannelType.GuildText },
    ]
  },
  {
    category: "PRODUCT",
    channels: [
      { name: "ai-analyzer", type: ChannelType.GuildText },
      { name: "feedback", type: ChannelType.GuildText },
      { name: "bug-reports", type: ChannelType.GuildText },
    ]
  },
  {
    category: "SUPPORT",
    channels: [
      { name: "open-ticket", type: ChannelType.GuildText },
      { name: "support-waiting", type: ChannelType.GuildText },
      { name: "support-status", type: ChannelType.GuildText },
      { name: "support-guide", type: ChannelType.GuildText },
    ]
  },
  {
    category: "BILLING",
    channels: [
      { name: "plans", type: ChannelType.GuildText },
      { name: "billing", type: ChannelType.GuildText },
      { name: "promotions", type: ChannelType.GuildText },
    ]
  },
  {
    category: "COMMUNITY VOICE",
    channels: [
      { name: "Lounge 1", type: ChannelType.GuildVoice },
      { name: "Lounge 2", type: ChannelType.GuildVoice },
      { name: "Gaming", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "SUPPORT VOICE",
    channels: [
      { name: "Waiting Room", type: ChannelType.GuildVoice },
      { name: "Support 1", type: ChannelType.GuildVoice },
      { name: "Support 2", type: ChannelType.GuildVoice },
      { name: "Technical Support", type: ChannelType.GuildVoice },
      { name: "Private Support", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "DEVELOPMENT",
    channels: [
      { name: "dev-chat", type: ChannelType.GuildText },
      { name: "dev-room", type: ChannelType.GuildText },
      { name: "dev-bugs", type: ChannelType.GuildText },
      { name: "code-review", type: ChannelType.GuildText },
      { name: "testing", type: ChannelType.GuildText },
      { name: "releases", type: ChannelType.GuildText },
    ]
  },
  {
    category: "DEV VOICE",
    channels: [
      { name: "Dev Room 1", type: ChannelType.GuildVoice },
      { name: "Dev Room 2", type: ChannelType.GuildVoice },
      { name: "Code Review", type: ChannelType.GuildVoice },
      { name: "Testing Room", type: ChannelType.GuildVoice },
      { name: "Architecture", type: ChannelType.GuildVoice },
      { name: "Incident Room", type: ChannelType.GuildVoice },
    ]
  },
  {
    category: "STAFF",
    channels: [
      { name: "staff-chat", type: ChannelType.GuildText },
      { name: "staff-tasks", type: ChannelType.GuildText },
      { name: "incidents", type: ChannelType.GuildText },
      { name: "logs", type: ChannelType.GuildText },
    ]
  },
];
