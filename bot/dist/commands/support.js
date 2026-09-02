import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { hasAnyRole } from '../lib/permissions.js';
import { claimNext, closeSession, getSupportConfig, listWaiting, moveSession, } from '../lib/supportQueue.js';
import { t } from '../i18n/index.js';
export const data = new SlashCommandBuilder()
    .setName('support')
    .setDescription('Voice support queue management')
    .addSubcommand((sub) => sub.setName('queue').setDescription('View the current support waiting queue'))
    .addSubcommand((sub) => sub
    .setName('claim')
    .setDescription('Claim the next (or a specific) user from the queue and move them to a support room')
    .addUserOption((opt) => opt.setName('user').setDescription('Specific user to claim (defaults to next in line)')))
    .addSubcommand((sub) => sub
    .setName('move')
    .setDescription('Move an in-session user to a different support room')
    .addUserOption((opt) => opt.setName('user').setDescription('User to move').setRequired(true))
    .addChannelOption((opt) => opt.setName('room').setDescription('Destination voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand((sub) => sub
    .setName('close')
    .setDescription('Close an active support session')
    .addUserOption((opt) => opt.setName('user').setDescription('User whose session to close').setRequired(true)))
    .addSubcommand((sub) => sub.setName('status').setDescription('Show support queue/room status'));
async function requireStaff(interaction, staffRoleIds) {
    const member = interaction.member;
    if (!member || !('roles' in member))
        return false;
    return hasAnyRole(member, staffRoleIds);
}
export async function execute(interaction) {
    const guild = interaction.guild;
    if (!guild)
        return;
    const server = await getOrCreateServerRow(guild);
    const config = await getSupportConfig(server.id);
    const sub = interaction.options.getSubcommand();
    if (sub === 'queue') {
        await interaction.deferReply({ ephemeral: true });
        const waiting = await listWaiting(server.id);
        if (!waiting.length) {
            await interaction.editReply(t(config.locale, 'support.noWaitingUsers'));
            return;
        }
        const lines = waiting.map((w) => `#${w.position} — <@${w.discord_user_id}>`);
        await interaction.editReply(lines.join('\n').slice(0, 1900));
        return;
    }
    const isStaff = await requireStaff(interaction, config.staffRoleIds);
    if (!isStaff) {
        await interaction.reply({ content: "You don't have permission to manage the support queue.", ephemeral: true });
        return;
    }
    if (sub === 'claim') {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user');
        const result = await claimNext(guild, interaction.user.id, config, targetUser?.id);
        if (!result.ok) {
            await interaction.editReply(result.reason === 'empty' ? t(config.locale, 'support.noWaitingUsers') : t(config.locale, 'support.roomFull'));
            return;
        }
        await interaction.editReply(`Claimed <@${result.userId}> → moved to ${result.room}.`);
        return;
    }
    if (sub === 'move') {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user', true);
        const room = interaction.options.getChannel('room', true);
        const voiceRoom = guild.channels.cache.get(room.id);
        if (!voiceRoom?.isVoiceBased()) {
            await interaction.editReply('That channel is not a voice channel.');
            return;
        }
        await moveSession(guild, targetUser.id, voiceRoom);
        await interaction.editReply(`Moved <@${targetUser.id}> to ${voiceRoom}.`);
        return;
    }
    if (sub === 'close') {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user', true);
        const closed = await closeSession(guild, targetUser.id);
        await interaction.editReply(closed ? `Closed the support session for <@${targetUser.id}>.` : t(config.locale, 'support.notInSession'));
        return;
    }
    if (sub === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const waiting = await listWaiting(server.id);
        const freeRooms = config.roomChannelIds.filter((id) => {
            const ch = guild.channels.cache.get(id);
            return ch?.isVoiceBased() && ch.members.size === 0;
        });
        await interaction.editReply(`Waiting: ${waiting.length}\nFree rooms: ${freeRooms.length}/${config.roomChannelIds.length}\nWaiting channel: ${config.waitingChannelId ? `<#${config.waitingChannelId}>` : 'not configured'}`);
    }
}
