const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, codeBlock } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'sorgu',
    aliases: ['sorgu'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!user) return message.reply({ content: '> Lütfen bir kullanıcı belirtin.' });

        const data = await getUserData(user.id);
        if (data.error) return message.reply({ content: `> ${data.error}` });

        const userInfo = data.UserInfo || {};
        const pages = [];
        const codeBlockContent = [
            codeBlock('yaml', [
                `→ Kullanıcı ID: ${userInfo.UserID || user.id}`,
                `→ Durum: ${userInfo.Presence?.Status || 'Yok'}`,
                `→ Yaş: ${data.TopAge || 'Bilinmiyor'}`,
            ].join('\n')),
            codeBlock('ansi', [
                '# Ek Bilgiler',
                `→ Global Ad: ${userInfo.UserGlobalName || 'Yok'}`,
                `→ İsim: ${data.TopName || 'Bilinmiyor'}`,
            ].join('\n'))
        ].join('\n\n');

        const embed1 = new EmbedBuilder()
            .setTitle(`${userInfo.UserName || user.username} Kullanıcı Bilgileri`)
            .setThumbnail(userInfo.UserdisplayAvatar || user.displayAvatarURL())
            .setColor('#2f3136')
            .addFields(
                { name: 'Detaylı Bilgiler', value: codeBlockContent }
            );

        if (userInfo.UserBanner && !userInfo.UserBanner.includes('singlecolorimage.com')) {
            embed1.setImage(userInfo.UserBanner);
        }

        pages.push(embed1);

        const ah = data.ActiveHours || {};
        const aktiflikYaml = [
            `Toplam Aktiflik: ${ah.totalActiveHours?.toString() || '0 saat'}`,
            `Özet: ${ah.summary || 'Yok'}`
        ].join('\n');

        const aktiflikAnsi = [
            '# Aktiflik Detayları',
            `Toplam Saat: ${ah.totalActiveHours?.toString() || '0 saat'}`,
            `Özet Bilgi: ${ah.summary || 'Yok'}`
        ].join('\n');

        const embed2 = new EmbedBuilder()
            .setTitle('Aktiflik Bilgileri')
            .setColor('Blurple')
            .addFields(
                {
                    name: 'Detaylı Aktiflik',
                    value: codeBlock('yaml', aktiflikYaml) + '\n' + codeBlock('ansi', aktiflikAnsi),
                    inline: false
                }
            )
            .setFooter({ text: 'Sayfa 2/6 - Aktiflik', iconURL: user.displayAvatarURL() });

        pages.push(embed2);

        const embed3 = new EmbedBuilder()
            .setTitle('Sunucu İstatistikleri')
            .setColor('Gold');

        const guildStats = Array.isArray(data.GuildStats) ? data.GuildStats : [];
        if (!guildStats.length) {
            embed3.setDescription('Sunucu istatistiği bulunamadı.');
        } else {
            for (const guild of guildStats.slice(0, 25)) {
                const yamlBlock = [
                    `→ İsim: ${guild.GuildName}`,
                    `→ Ses Süresi: ${guild.VoiceStatText}`,
                    `→ Mesaj Sayısı: ${guild.MessageStat}`
                ].join('\n');

                embed3.addFields({
                    name: guild.GuildName || 'Bilinmeyen Sunucu',
                    value: codeBlock('yaml', yamlBlock),
                    inline: false
                });
            }
        }

        embed3.setFooter({ text: 'Sayfa 3/6 - Sunucu İstatistikleri', iconURL: user.displayAvatarURL() });
        pages.push(embed3);

        const embed4 = new EmbedBuilder()
            .setTitle('Yetkili Olduğu Sunucular')
            .setColor('Green');

        const guildStaff = Array.isArray(data.GuildStaff) ? data.GuildStaff : [];
        if (!guildStaff.length) {
            embed4.setDescription('Kullanıcı hiçbir sunucuda yetkili değil.');
        } else {
            for (const staff of guildStaff.slice(0, 25)) {
                const ansiBlock = [
                    '# Yetkili Sunucu Bilgileri',
                    `→ Sunucu: ${staff.GuildName}`,
                    `→ İsim: ${staff.displayName}`,
                    `→ ID: ${staff.GuildId}`
                ].join('\n');

                embed4.addFields({
                    name: staff.GuildName || 'Bilinmeyen Sunucu',
                    value: codeBlock('yaml', ansiBlock),
                    inline: false
                });
            }
        }

        embed4.setFooter({ text: 'Sayfa 4/6 - Yetkili Olduğu Sunucular', iconURL: user.displayAvatarURL() });
        pages.push(embed4);

        const embed5 = new EmbedBuilder()
            .setTitle('Üye Olduğu Sunucular')
            .setColor('Aqua');

        const guilds = Array.isArray(data.Guilds) ? data.Guilds : [];
        if (!guilds.length) {
            embed5.setDescription('Üye olduğu sunucu bilgisi bulunamadı.');
        } else {
            for (const g of guilds.slice(0, 25)) {
                const ansiBlock = [
                    '# Üyelik Bilgileri',
                    `→ Sunucu: ${g.GuildName}`,
                    `→ Takma Ad: ${g.displayName}`,
                    `→ Katılım Tarihi: ${g.JoinTime}`,
                    `→ Booster: ${g.Booster ? 'Evet' : 'Hayır'}`
                ].join('\n');

                embed5.addFields({
                    name: g.GuildName || 'Bilinmeyen Sunucu',
                    value: codeBlock('yaml', ansiBlock),
                    inline: false
                });
            }
        }

        embed5.setFooter({ text: 'Sayfa 5/6 - Üyelikler', iconURL: user.displayAvatarURL() });
        pages.push(embed5);

        const embed6 = new EmbedBuilder()
            .setTitle('Son Görülme Bilgisi')
            .setColor('DarkRed')
            .setThumbnail(user.displayAvatarURL());

        const messageLastSeen = data.LastSeen?.Message?.[0] || null;
        const voiceLastSeen = data.LastSeen?.Voice?.[0] || null;

        const messageBlock = messageLastSeen?.channelName
            ? [
                `channelName: ${messageLastSeen.channelName}`,
                `date: ${messageLastSeen.date}`
            ].join('\n')
            : 'Yok';

        const voiceBlock = voiceLastSeen?.channelName
            ? [
                `channelName: ${voiceLastSeen.channelName}`,
                `date: ${voiceLastSeen.date}`
            ].join('\n')
            : 'Yok';

        embed6.addFields(
            {
                name: 'Mesaj Kanalı',
                value: codeBlock('yaml', messageBlock),
                inline: true
            },
            {
                name: 'Ses Kanalı',
                value: codeBlock('yaml', voiceBlock),
                inline: true
            }
        );

        embed6.setFooter({ text: 'Sayfa 6/6 - Son Görülme', iconURL: user.displayAvatarURL() });
        pages.push(embed6);

        let page = 0;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sorgu-prev').setLabel('◀️ Geri').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('sorgu-next').setLabel('İleri ▶️').setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({ embeds: [pages[page]], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            if (i.customId === 'sorgu-next') page = (page + 1) % pages.length;
            if (i.customId === 'sorgu-prev') page = (page - 1 + pages.length) % pages.length;
            await msg.edit({ embeds: [pages[page]] });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};

async function getUserData(UserID) {
    if (!UserID) return { error: 'UserID belirtilmelidir.' };

    try {
        const response = await axios.get(`https://app.findcord.com/api/user/${UserID}`, {
            headers: {
                'Authorization': 'a49298cbb00d61581675ba8e2a35ecd8cd2bfc3a595b8d498de506cdc2cf6806',
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            return { error: `Sunucu hatası: ${error.response.status} - ${error.response.data?.message || 'Bilinmeyen hata'}` };
        } else if (error.request) {
            return { error: 'Sunucudan yanıt alınamadı.' };
        } else {
            return { error: `İstek hatası: ${error.message}` };
        }
    }
}
