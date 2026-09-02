import { SlashCommandBuilder } from 'discord.js';
export const data = new SlashCommandBuilder().setName('ping').setDescription('Health check for the bot');
export async function execute(interaction) {
    await interaction.reply({ content: 'Pong.', ephemeral: true });
}
