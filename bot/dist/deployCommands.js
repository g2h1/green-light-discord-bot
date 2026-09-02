import { REST, Routes } from 'discord.js';
import { env } from './lib/env.js';
import { commands } from './commandRegistry.js';
const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);
const body = commands.map((c) => c.data.toJSON());
const result = await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
console.log(`Registered ${result.length} global command(s).`);
