const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    PermissionsBitField,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} = require('discord.js');

module.exports = {
    name: 'room',
    aliases: ['oda', 'roompanel', 'odapanel'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isAuth = Array.isArray(wency?.auth) && wency.auth.some((x) => message.member.roles.cache.has(x));
        if (!isAdmin && !isAuth) return message.reply({ content: 'Yetkin yok.' });

        const eChange = findEmoji(client, 'wencyChange') || '✏️';
        const eLimit = findEmoji(client, 'wencyLimit') || '👥';
        const eLock = findEmoji(client, 'wencyLock') || '🔒';
        const eVisible = findEmoji(client, 'wencyVisible') || '👁️';
        const eMember = findEmoji(client, 'wencyMember') || '🧩';
        const eInfo = findEmoji(client, 'wencyInfo') || '📋';
        const eDeny = findEmoji(client, 'wencyDeny') || '🔕';
        const eCrown = findEmoji(client, 'wencyCrown') || '👑';
        const eTrash = findEmoji(client, 'wencyTrash') || '🗑️';

        const rows = [
            new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('changeName')
                .setEmoji(eChange)
                .setLabel('İsim Değiştir')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('changeLimit')
                .setEmoji(eLimit)
                .setLabel('Limit Ayarla')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('roomInfo')
                .setEmoji(eInfo)
                .setLabel('Oda Bilgisi')
                .setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lockOrUnlock')
                .setEmoji(eLock)
                .setLabel('Kilitle / Aç')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('addOrRemove')
                .setEmoji(eMember)
                .setLabel('Üye İzni')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('denyMember')
                .setEmoji(eDeny)
                .setLabel('Üyeyi Yasakla')
                .setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('visibleOrInvisible')
                .setEmoji(eVisible)
                .setLabel('Görünürlük')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('transferOwner')
                .setEmoji(eCrown)
                .setLabel('Devret')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('deleteRoom')
                .setEmoji(eTrash)
                .setLabel('Odayı Sil')
                .setStyle(ButtonStyle.Danger),
            ),
        ];

        const container = new ContainerBuilder()
            .setAccentColor(0xe91e63)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                `# ‪‪❤︎‬ ${message.guild.name} Özel Oda Paneli`,
                'Kendine ait ses odanı oluşturabilir ve tüm ayarlarını bu panelden yönetebilirsin.',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                '## 🎧 Özel Oda Oluşturma',
                `${wency.secretRoomChannel ? `<#${wency.secretRoomChannel}>` : '**Özel Oda Oluştur**'} kanalına katıldığında odan otomatik oluşturulur.`,
                'Odanın adı `‪‪❤︎‬ {isim}` formatında açılır.',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                '## ⚙️ Oda Yönetimi',
                '• İsim, limit ve oda bilgilerini güncelle.',
                '• Odayı kilitle, üyelere izin ver veya girişlerini yasakla.',
                '• Oda görünürlüğünü yalnızca aktif booster üyeler değiştirebilir.',
                '• Sahipliği devret veya odanı tamamen sil.',
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

        rows.forEach((row) => container.addActionRowComponents(row));

        return message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [], users: [], roles: [] },
        });
    },
};

function findEmoji(client, name) {
    return client.emojis.cache.find((emoji) => emoji.name === name)?.id || null;
}
