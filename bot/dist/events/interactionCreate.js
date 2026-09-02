import { commandsByName } from '../commandRegistry.js';
import { handleTicketClaim, handleTicketClose, handleTicketDelete, handleTicketLanguage, handleTicketOpen, handleTicketRate, handleTicketReopen, } from '../lib/tickets.js';
import { handleGiveawayEnter } from '../lib/giveaways.js';
async function routeButton(interaction) {
    const [action, ...args] = interaction.customId.split(':');
    switch (action) {
        case 'ticket_open':
            return handleTicketOpen(interaction, args[0], args[1]);
        case 'ticket_claim':
            return handleTicketClaim(interaction);
        case 'ticket_close':
            return handleTicketClose(interaction);
        case 'ticket_reopen':
            return handleTicketReopen(interaction);
        case 'ticket_delete':
            return handleTicketDelete(interaction);
        case 'ticket_rate':
            return handleTicketRate(interaction, args[0]);
        case 'ticket_lang':
            return handleTicketLanguage(interaction, args[0], args[1]);
        case 'giveaway_enter':
            return handleGiveawayEnter(interaction, args[0]);
        default:
            return undefined;
    }
}
export function registerInteractionCreate(client) {
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            try {
                await routeButton(interaction);
            }
            catch (err) {
                console.error(`Error handling button ${interaction.customId}:`, err);
                // This fallback reply can itself fail (e.g. the interaction token already
                // expired) — that must never become an unhandled rejection that crashes
                // the whole bot process over one bad interaction, so it gets its own guard.
                try {
                    const payload = { content: 'Something went wrong handling that action.', ephemeral: true };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(payload);
                    }
                    else {
                        await interaction.reply(payload);
                    }
                }
                catch (notifyErr) {
                    console.error('Could not notify the user of the earlier error (interaction likely expired):', notifyErr);
                }
            }
            return;
        }
        if (!interaction.isChatInputCommand())
            return;
        const command = commandsByName.get(interaction.commandName);
        if (!command)
            return;
        try {
            await command.execute(interaction);
        }
        catch (err) {
            console.error(`Error executing command ${interaction.commandName}:`, err);
            try {
                const payload = { content: 'Something went wrong running that command.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload);
                }
                else {
                    await interaction.reply(payload);
                }
            }
            catch (notifyErr) {
                console.error('Could not notify the user of the earlier error (interaction likely expired):', notifyErr);
            }
        }
    });
}
