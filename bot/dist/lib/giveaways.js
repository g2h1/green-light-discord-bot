import { supabase } from './supabase.js';
export async function handleGiveawayEnter(interaction, giveawayId) {
    const { data: giveaway } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .maybeSingle();
    if (!giveaway || giveaway.status !== 'active') {
        await interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
        return;
    }
    if (giveaway.required_role_id) {
        const roles = interaction.member?.roles;
        const hasRole = Array.isArray(roles)
            ? roles.includes(giveaway.required_role_id)
            : (roles?.cache.has(giveaway.required_role_id) ?? false);
        if (!hasRole) {
            await interaction.reply({
                content: `You need the <@&${giveaway.required_role_id}> role to enter.`,
                ephemeral: true,
            });
            return;
        }
    }
    if (giveaway.min_account_age_days) {
        const ageDays = (Date.now() - interaction.user.createdTimestamp) / 86_400_000;
        if (ageDays < giveaway.min_account_age_days) {
            await interaction.reply({
                content: `Your account must be at least ${giveaway.min_account_age_days} days old to enter.`,
                ephemeral: true,
            });
            return;
        }
    }
    const { error } = await supabase
        .from('giveaway_entries')
        .upsert({ giveaway_id: giveawayId, discord_user_id: interaction.user.id }, { onConflict: 'giveaway_id,discord_user_id' });
    if (error) {
        await interaction.reply({ content: 'Failed to enter the giveaway. Try again.', ephemeral: true });
        return;
    }
    await interaction.reply({ content: "You're entered! Good luck.", ephemeral: true });
}
