import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { env } from './lib/env.js';
import { registerReady } from './events/ready.js';
import { registerInteractionCreate } from './events/interactionCreate.js';
import { registerMessageCreate } from './events/messageCreate.js';
import { registerGuildLogging } from './events/guildLogging.js';
import { registerWelcome } from './events/welcome.js';
import { registerVoiceStateUpdate } from './events/voiceStateUpdate.js';
// Last-resort net: every event handler already catches its own errors, but a
// single unforeseen unhandled rejection anywhere used to crash the whole bot
// process (as happened when a Discord API error inside an error handler went
// uncaught). Log and keep running instead — the bot serving one live Discord
// server should never go down over one bad interaction.
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection (bot process kept running):', reason);
});
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});
registerReady(client);
registerInteractionCreate(client);
registerMessageCreate(client);
registerGuildLogging(client);
registerWelcome(client);
registerVoiceStateUpdate(client);
client.login(env.DISCORD_BOT_TOKEN);
