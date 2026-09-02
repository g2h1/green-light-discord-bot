import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../lib/supabase.js';
import { getPanelAssetUrl, removePanelAsset, uploadPanelAsset } from '../lib/storage.js';
const SLOT_COLUMN = {
    banner: 'banner_asset_path',
    main_image: 'main_image_asset_path',
    thumbnail: 'thumbnail_asset_path',
};
export const data = new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Manage images for a ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub
    .setName('set-image')
    .setDescription('Upload/replace an image slot on a ticket panel')
    .addStringOption((opt) => opt.setName('panel_id').setDescription('Ticket panel ID').setRequired(true))
    .addStringOption((opt) => opt
    .setName('slot')
    .setDescription('Which image slot')
    .setRequired(true)
    .addChoices({ name: 'Banner', value: 'banner' }, { name: 'Main image', value: 'main_image' }, { name: 'Thumbnail', value: 'thumbnail' }))
    .addAttachmentOption((opt) => opt.setName('image').setDescription('Image file').setRequired(true)))
    .addSubcommand((sub) => sub
    .setName('remove-image')
    .setDescription('Remove an image slot from a ticket panel')
    .addStringOption((opt) => opt.setName('panel_id').setDescription('Ticket panel ID').setRequired(true))
    .addStringOption((opt) => opt
    .setName('slot')
    .setDescription('Which image slot')
    .setRequired(true)
    .addChoices({ name: 'Banner', value: 'banner' }, { name: 'Main image', value: 'main_image' }, { name: 'Thumbnail', value: 'thumbnail' })))
    .addSubcommand((sub) => sub
    .setName('preview')
    .setDescription('Preview the current images on a ticket panel')
    .addStringOption((opt) => opt.setName('panel_id').setDescription('Ticket panel ID').setRequired(true)));
async function loadPanel(panelId) {
    const { data } = await supabase
        .from('ticket_panels')
        .select('id, server_id, banner_asset_path, main_image_asset_path, thumbnail_asset_path')
        .eq('id', panelId)
        .maybeSingle();
    return data;
}
export async function execute(interaction) {
    if (!interaction.guild)
        return;
    const sub = interaction.options.getSubcommand();
    const panelId = interaction.options.getString('panel_id', true);
    await interaction.deferReply({ ephemeral: true });
    const panel = await loadPanel(panelId);
    if (!panel) {
        await interaction.editReply('No ticket panel found with that ID.');
        return;
    }
    if (sub === 'set-image') {
        const slot = interaction.options.getString('slot', true);
        const attachment = interaction.options.getAttachment('image', true);
        const previousPath = panel[SLOT_COLUMN[slot]];
        try {
            const path = await uploadPanelAsset(panel.server_id, panel.id, slot, attachment.url, attachment.contentType ?? null);
            await supabase.from('ticket_panels').update({ [SLOT_COLUMN[slot]]: path }).eq('id', panel.id);
            if (previousPath && previousPath !== path)
                await removePanelAsset(previousPath);
            await interaction.editReply(`✅ ${slot} image updated.`);
        }
        catch (err) {
            console.error('ticketpanel set-image failed:', err);
            await interaction.editReply('Failed to upload that image. Make sure it is under 8MB and a valid image file.');
        }
        return;
    }
    if (sub === 'remove-image') {
        const slot = interaction.options.getString('slot', true);
        const path = panel[SLOT_COLUMN[slot]];
        if (!path) {
            await interaction.editReply(`No ${slot} image is set on this panel.`);
            return;
        }
        await removePanelAsset(path);
        await supabase.from('ticket_panels').update({ [SLOT_COLUMN[slot]]: null }).eq('id', panel.id);
        await interaction.editReply(`🗑️ ${slot} image removed.`);
        return;
    }
    if (sub === 'preview') {
        const embed = new EmbedBuilder().setTitle(`Panel ${panel.id} — image preview`).setColor(0x17c964);
        const bannerUrl = panel.banner_asset_path ? await getPanelAssetUrl(panel.banner_asset_path) : null;
        const mainUrl = panel.main_image_asset_path ? await getPanelAssetUrl(panel.main_image_asset_path) : null;
        const thumbUrl = panel.thumbnail_asset_path ? await getPanelAssetUrl(panel.thumbnail_asset_path) : null;
        if (mainUrl)
            embed.setImage(mainUrl);
        if (thumbUrl)
            embed.setThumbnail(thumbUrl);
        embed.setDescription([
            `Banner: ${bannerUrl ? 'set' : 'not set'}`,
            `Main image: ${mainUrl ? 'set' : 'not set'}`,
            `Thumbnail: ${thumbUrl ? 'set' : 'not set'}`,
        ].join('\n'));
        await interaction.editReply({ embeds: [embed] });
        if (bannerUrl)
            await interaction.followUp({ content: bannerUrl, ephemeral: true });
    }
}
