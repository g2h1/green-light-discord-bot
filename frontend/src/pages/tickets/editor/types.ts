export type ButtonColor = 'green' | 'gray' | 'red' | 'blue'
export type MentionBehaviour = 'none' | 'mention' | 'ping_and_remove'
export type TranscriptBehavior = 'channel' | 'dm' | 'none'

export interface PanelConfig {
  thumbnailUrl?: string
  imageUrl?: string
  buttonText: string
  buttonColor: ButtonColor
  buttonEmoji?: string

  supportTeamRoleId?: string
  knowledgeBaseCategories: string[]
  ticketCategoryId?: string
  awaitingResponseCategoryId?: string
  transcriptChannelId?: string
  mentionOnOpenRoleIds: string[]
  mentionBehaviour: MentionBehaviour
  formFields: Array<{ label: string; required: boolean }>
  enableTranscript: boolean

  welcomeEnabled: boolean
  welcomeMessage?: string
  welcomeEmbedTitle?: string
  welcomeEmbedDescription?: string
  welcomeImageUrl?: string
  welcomeThumbnailUrl?: string

  namingFormat: string
  maxOpenTicketsPerUser: number
  allowReopen: boolean
  allowStaffClose: boolean
  deleteOnClose: boolean
  archiveInsteadOfDelete: boolean
  transcriptBehavior: TranscriptBehavior

  enableClaim: boolean
  claimButtonText: string
  claimButtonEmoji?: string
  claimPermissionRoleIds: string[]
  enableClose: boolean
  closeButtonText: string
  closeButtonEmoji?: string
}

export interface PanelFormState {
  channelId: string
  title: string
  description: string
  color: number
  disabled: boolean
  config: PanelConfig
}

export const BUTTON_COLOR_HEX: Record<ButtonColor, string> = {
  green: '#22c55e',
  gray: '#6b7280',
  red: '#ef4444',
  blue: '#3b82f6',
}

export function defaultPanelForm(): PanelFormState {
  return {
    channelId: '',
    title: 'Open a ticket!',
    description: 'Click the button below to open a support ticket with our team.',
    color: 0x17c964,
    disabled: false,
    config: {
      buttonText: 'Reach Out to Us',
      buttonColor: 'green',
      knowledgeBaseCategories: [],
      mentionOnOpenRoleIds: [],
      mentionBehaviour: 'mention',
      formFields: [],
      enableTranscript: true,
      welcomeEnabled: true,
      welcomeEmbedTitle: '{ticket}',
      welcomeEmbedDescription: 'Welcome {user}. Support will be with you shortly.',
      namingFormat: 'ticket-{username}',
      maxOpenTicketsPerUser: 1,
      allowReopen: true,
      allowStaffClose: true,
      deleteOnClose: false,
      archiveInsteadOfDelete: true,
      transcriptBehavior: 'channel',
      enableClaim: true,
      claimButtonText: 'Claim',
      claimPermissionRoleIds: [],
      enableClose: true,
      closeButtonText: 'Close',
    },
  }
}
