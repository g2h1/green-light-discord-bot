import type { Client, VoiceState } from 'discord.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { getSupportConfig, joinQueue, leaveQueue, closeSession, announceQueuePosition } from '../lib/supportQueue.js'

export function registerVoiceStateUpdate(client: Client) {
  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    const guild = newState.guild ?? oldState.guild
    if (!guild) return

    try {
      const server = await getOrCreateServerRow(guild)
      const config = await getSupportConfig(server.id)
      if (!config.waitingChannelId) return

      const userId = newState.id ?? oldState.id
      const joinedWaiting = newState.channelId === config.waitingChannelId && oldState.channelId !== config.waitingChannelId
      const leftWaiting = oldState.channelId === config.waitingChannelId && newState.channelId !== config.waitingChannelId
      const leftRoom =
        config.roomChannelIds.includes(oldState.channelId ?? '') && newState.channelId !== oldState.channelId

      if (joinedWaiting) {
        const result = await joinQueue(guild, userId, config.waitingChannelId)
        const member = newState.member
        if (member) {
          await member.send(announceQueuePosition(config.locale, result.position)).catch(() => undefined)
        }
        return
      }

      if (leftWaiting) {
        await leaveQueue(guild, userId)
        return
      }

      if (leftRoom) {
        await closeSession(guild, userId)
      }
    } catch (err) {
      console.error('Error handling voiceStateUpdate for support queue:', err)
    }
  })
}
