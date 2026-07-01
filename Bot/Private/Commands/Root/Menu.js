const {
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} = require('discord.js');

module.exports = {
    name: 'menu',
    aliases: ['menü'],
    category: 'Root',

    execute: async (client, message) => {
        if (!global.system.ownerID.includes(message.author.id)) return;

        const menu = new StringSelectMenuBuilder()
            .setCustomId('color-role-select')
            .setPlaceholder('Bir renk seç veya rollerini temizle')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                { label: 'Gri', value: 'gri', emoji: '1217564394309947495' },
                { label: 'Siyah', value: 'siyah', emoji: '1217564387649388554' },
                { label: 'Beyaz', value: 'beyaz', emoji: '1217564357810978897' },
                { label: 'Kırmızı', value: 'kırmızı', emoji: '1217564350320083075' },
                { label: 'Mavi', value: 'mavi', emoji: '1217564417672351775' },
                { label: 'Sarı', value: 'sarı', emoji: '1217564355625746606' },
                { label: 'Yeşil', value: 'yeşil', emoji: '1217564391344701532' },
                { label: 'Mor', value: 'mor', emoji: '1217564359216337051' },
                { label: 'Turuncu', value: 'turuncu', emoji: '1217564396176412823' },
                { label: 'Pembe', value: 'pembe', emoji: '1217564354548072508' },
                { label: 'Temizle', value: 'clear', emoji: '🧹', description: 'Tüm renk rollerini kaldır' },
            ]);

        const container = new ContainerBuilder()
            .setAccentColor(0x9b59b6)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                '# 🎨 Renk Rolü Menüsü',
                'Aşağıdaki menüden kullanmak istediğin tek renk rolünü seçebilirsin.',
                'Seçili rengine tekrar basarsan rol kaldırılır. `Temizle` seçeneği tüm renk rollerini siler.',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(new ActionRowBuilder().addComponents(menu));

        return message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    }
};
