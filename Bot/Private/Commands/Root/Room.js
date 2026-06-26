const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

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
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('changeLimit')
                .setEmoji(eLimit)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('roomInfo')
                .setEmoji(eInfo)
                .setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lockOrUnlock')
                .setEmoji(eLock)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('addOrRemove')
                .setEmoji(eMember)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('denyMember')
                .setEmoji(eDeny)
                .setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('visibleOrInvisible')
                .setEmoji(eVisible)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('transferOwner')
                .setEmoji(eCrown)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('deleteRoom')
                .setEmoji(eTrash)
                .setStyle(ButtonStyle.Secondary),
            ),
        ];

        return message.channel.send({
            content: [
                'Merhaba **H A C I Z A D E** üyeleri,',
                'Sunucumuzda kalabalık odalar yerine kendinize özel bir ses kanalı oluşturabilirsiniz! 🔥',
                '',
                '**Kendinize özel bir ses kanalı oluşturmak için:**',
                `> 🔊 ${wency.secretRoomChannel ? `<#${wency.secretRoomChannel}>` : '**Özel Oda Oluştur!**'} ses kanalına giriş yaparak kendi ses kanalınızı oluşturabilirsiniz.`,
                '> Kanalınızı oluşturduktan sonra aşağıdaki butonları kullanarak odanızı kolayca yönetebilirsiniz!',
                '',
                '**Odanızı Güncelleyin:**',
                '> ✏️ Bu butonu kullanarak oda **isminizi** güncelleyebilirsiniz!',
                '> 🔢 Bu butonu kullanarak oda **limitinizi** güncelleyebilirsiniz!',
                '> 📋 Bu butonu kullanarak oda **bilgilerinizi** (sahip, limit, durum, sestekiler, izinliler, yasaklılar) görüntüleyebilirsiniz!',
                '',
                '**Odanızın Erişimini Kontrol Edin:**',
                '> 🔒 Bu butonu kullanarak odanızı **dışarıya kapatabilir/açabilirsiniz!**',
                '> 👥 Bu butonu kullanarak seçtiğiniz kullanıcıların odaya **girişini açabilirsiniz!**',
                '> 🔕 Bu butonu kullanarak seçtiğiniz kullanıcıların odaya **girişini yasaklayabilirsiniz!**',
                '',
                '**Diğer Oda Ayarları:**',
                '> 👁️ Bu butonu kullanarak odanızı **görünmez/görünür** olarak güncelleyebilirsiniz!',
                '> 👑 Bu butonu kullanarak oda sahipliğini başka bir kullanıcıya **devredebilirsiniz!**',
                '> 🗑️ Bu butonu kullanarak odanızı **silebilirsiniz!**',
                '',
                '**Keyifli sohbetler dileriz.**',
            ].join('\n'),
            components: rows,
        });
    },
};

function findEmoji(client, name) {
    return client.emojis.cache.find((emoji) => emoji.name === name)?.id || null;
}
