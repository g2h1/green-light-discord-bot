export interface TicketCategory {
  label: string
  emoji?: string
}

export interface TicketPanel {
  id: string
  channel_id: string
  title: string
  description: string | null
  categories: TicketCategory[]
  message_id: string | null
  disabled: boolean
  created_at: string
}

export interface Ticket {
  id: string
  discord_channel_id: string
  category: string
  opener_discord_id: string
  claimed_by_discord_id: string | null
  status: 'open' | 'claimed' | 'closed'
  created_at: string
  closed_at: string | null
}

export interface TicketMessage {
  id: string
  author_discord_id: string
  author_username: string
  content: string
  created_at: string
}

export interface TicketRating {
  stars: number
  rated_by_discord_id: string
}
