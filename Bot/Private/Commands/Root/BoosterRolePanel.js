const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} = require('discord.js');

module.exports = {
    name: 'boosterrolpanel',
    aliases: ['boostrolpanel', 'boostpanel', 'boostrol'],
    category: 'Root',

    execute: async (client, message) => {
        if (!global.system.ownerID.includes(message.author.id)) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('booster-role:create').setLabel('Oluştur').setEmoji('✨').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('booster-role:edit').setLabel('Düzenle').setEmoji('🖊️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('booster-role:color').setLabel('Renk').setEmoji('🎨').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('booster-role:share').setLabel('Paylaşım').setEmoji('👤➕').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('booster-role:delete').setLabel('Sil').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        );
        const container = new ContainerBuilder()
            .setAccentColor(0xeb459e)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                '# 💎 Booster Özel Rol Sistemi',
                'Sunucumuza boost basan değerli üyelerimize özel: **kendine ait bir rol!**',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                '✨ **Oluştur** — kendi adına özel rol (limit: 1)',
                '🖊️ **Düzenle** — oluşturduğun rolün ismini değiştir',
                '🎨 **Renk** — katı, gradyan veya holografik renk ver',
                '👤➕ **Paylaşım** — rolünü arkadaşlarınla paylaş (en fazla 15)',
                '🗑️ **Sil** — özel rolünü tamamen kaldır',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Yalnızca aktif boost basan üyeler içindir. Boostunu çekersen rolün 3 gün askıya alınır; geri basarsan kurtarabilirsin.'))
            .addActionRowComponents(row);

        return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};
