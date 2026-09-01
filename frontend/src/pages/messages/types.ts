export interface Channel {
  id: string
  name: string
  type: number
}

export interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface EmbedDraft {
  title?: string
  description?: string
  url?: string
  color?: number
  timestamp?: string
  footer?: { text: string; icon_url?: string }
  author?: { name: string; icon_url?: string; url?: string }
  thumbnail?: { url: string }
  image?: { url: string }
  fields?: EmbedField[]
}

export interface ButtonDraft {
  label: string
  url: string
  emoji?: string
}

export interface MessageDraft {
  channelId: string
  content: string
  useEmbed: boolean
  embed: EmbedDraft
  buttons: ButtonDraft[]
  mentionEveryone: boolean
  mentionHere: boolean
}

export interface Template {
  id: string
  name: string
  category: string
  content: string | null
  embed: EmbedDraft | null
  buttons: ButtonDraft[]
}

export interface ScheduledMessage {
  id: string
  channel_id: string
  content: string | null
  embed: EmbedDraft | null
  send_at: string
  recurrence: 'none' | 'daily' | 'weekly' | 'custom'
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  last_error: string | null
}

export const TEMPLATE_CATEGORIES = [
  'Announcement',
  'Giveaway',
  'Welcome',
  'Tournament',
  'Warning',
  'Update',
  'Custom',
]

export function emptyDraft(): MessageDraft {
  return {
    channelId: '',
    content: '',
    useEmbed: false,
    embed: { color: 0x17c964 },
    buttons: [],
    mentionEveryone: false,
    mentionHere: false,
  }
}
