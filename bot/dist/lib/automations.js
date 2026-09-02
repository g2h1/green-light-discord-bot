import { supabase } from './supabase.js';
import { logEvent } from './logging.js';
function fillVariables(text, vars) {
    return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
export async function runAutomations(guild, triggerEvent, context) {
    const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_guild_id', guild.id)
        .maybeSingle();
    if (!server)
        return;
    const { data: automations } = await supabase
        .from('automations')
        .select('id, name, enabled, automation_actions(*)')
        .eq('server_id', server.id)
        .eq('trigger_event', triggerEvent)
        .eq('enabled', true);
    for (const automation of (automations ?? [])) {
        const actions = [...automation.automation_actions].sort((a, b) => a.order_index - b.order_index);
        for (const action of actions) {
            try {
                if (action.action_type === 'give_role' && context.userId) {
                    const roleId = action.config.roleId;
                    if (roleId) {
                        const member = await guild.members.fetch(context.userId).catch(() => null);
                        await member?.roles.add(roleId).catch(() => undefined);
                    }
                }
                if (action.action_type === 'send_message') {
                    const channelId = action.config.channelId;
                    const template = action.config.message ?? '';
                    const channel = channelId ? guild.channels.cache.get(channelId) : undefined;
                    if (channel?.isTextBased()) {
                        await channel.send(fillVariables(template, context.vars ?? {}));
                    }
                }
                if (action.action_type === 'send_log') {
                    await logEvent(guild, 'bot', 'automation_run', `Automation "${automation.name}" ran.`, {
                        automationId: automation.id,
                        triggerEvent,
                    });
                }
            }
            catch (err) {
                console.error(`Automation action failed (automation ${automation.id}):`, err);
            }
        }
    }
}
