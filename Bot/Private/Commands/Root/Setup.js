const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits, codeBlock, EmbedBuilder, bold, ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const SpamGuard = require('../../Events/messageCreate/Functions/Guard');

const systemLabels = {
    autoRole: "Otomatik Kayıt",
    genderSystem: "Cinsiyetli Kayıt",
    linkGuard: "Link Engel",
    spamGuard: "Spam Engel",
    gifGuard: "Gif Engel"
};

module.exports = {
    name: 'setup',
    aliases: ['kur'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        const setupEmbed = new EmbedBuilder({
            author: { name: message.guild.name, iconURL: message.guild.iconURL() },
            footer: { text: 'Created By Wency', iconURL: message.guild.iconURL() },
            description: [
                `${codeBlock('fix', '# Kurulum Seçenekleri')}`,
                `• Rol Kurulumu : Sunucu rollerini otomatik oluşturur`,
                `• Emoji Kurulumu : Gerekli emojileri yükler`,
                `• Log Kurulumu : Log kanallarını ayarlar`,
                '',
                `${codeBlock('fix', '# Sistem Durumu')}`,
                `${wency.autoRole ? '✅' : '❌'} Otomatik Rol : ${wency.autoRole ? 'Aktif' : 'Devre Dışı'}`,
                `${wency.genderSystem ? '✅' : '❌'} Cinsiyet Sistemi : ${wency.genderSystem ? 'Aktif' : 'Devre Dışı'}`,
                `${wency.linkGuard ? '✅' : '❌'} Link Engel : ${wency.linkGuard ? 'Aktif' : 'Devre Dışı'}`,
                `${wency.spamGuard ? '✅' : '❌'} Spam Engel : ${wency.spamGuard ? 'Aktif' : 'Devre Dışı'}`,
                `${wency.gifGuard ? '✅' : '❌'} Gif Engel : ${wency.gifGuard ? 'Aktif' : 'Devre Dışı'}`,
                '',
                `${codeBlock('fix', '# Sunucu İstatistikleri')}`,
                `• Toplam Üye : ${message.guild.memberCount}`,
                `• Toplam Rol : ${message.guild.roles.cache.size}`,
                `• Toplam Kanal : ${message.guild.channels.cache.size}`,
            ].join('\n'),
        });

        const mainRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role-setup').setLabel('Rol Kurulumu').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('emoji-setup').setLabel('Emoji Kurulumu').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('log-setup').setLabel('Log Kurulumu').setStyle(ButtonStyle.Secondary),
        );

        const systemRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setPlaceholder('Sistemleri & Ayarları Güncellemek İçin Tıkla!')
                .setCustomId('systems')
                .addOptions([
                    { label: 'Otomatik Kayıt', value: 'autoRole', description: 'Sunucuya girene otomatik üye rolü verir.', emoji: wency.autoRole ? '✅' : '❌' },
                    { label: 'Cinsiyetli Kayıt', value: 'genderSystem', description: 'Cinsiyetli kayıt sistemnini açar kapatır', emoji: wency.genderSystem ? '✅' : '❌' },
                    { label: 'Link Engel', value: 'linkGuard', description: 'Link engel koruma açar kapatır.', emoji: wency.linkGuard ? '✅' : '❌' },
                    { label: 'Spam Engel', value: 'spamGuard', description: 'Mesaj spam korumasını açar kapatır.', emoji: wency.spamGuard ? '✅' : '❌' },
                    { label: 'Gif Engel', value: 'gifGuard', description: 'Gif engel korumasını açar kapatır.', emoji: wency.gifGuard ? '✅' : '❌' },
                ]));

        const roleRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setPlaceholder('Rolleri Güncellemek İçin Tıkla!')
                .setCustomId('roles')
                .addOptions([
                    { label: 'Ban ve Jail Yetkilileri', value: 'banAuth_array', description: '(Ban, Jail)', emoji: wency.banAuth && wency.banAuth.length > 0 ? '✅' : '❌' },
                    { label: 'Yetkililer', value: 'auth_array', description: '(Referans, Mute, Sil, Vip, Kilit, Say, Rol)', emoji: wency.auth && wency.auth.length > 0 ? '✅' : '❌' },
                    { label: 'GIF İzinli Roller', value: 'gifAuthRole_array', description: 'GIF göndermesine izin verilen roller.', emoji: wency.gifAuthRole && wency.gifAuthRole.length > 0 ? '✅' : '❌' },
                    { label: 'Vip Rolü', value: 'vipRole_string', description: 'Vip rolü.', emoji: wency.vipRole ? '✅' : '❌' },
                    { label: 'Jail Rolü', value: 'jailRole_string', description: 'Jail verilen kullanıcıya uygulanacak rol.', emoji: wency.jailRole ? '✅' : '❌' },
                    { label: 'Guild Tag Rolü', value: 'guildTagRole_string', description: 'Guild tag alan kullanıcıya verilecek rol.', emoji: wency.guildTagRole ? '✅' : '❌' },
                    { label: 'Owner Rolleri', value: 'ownerRole_array', description: 'Kurucu komutlarını kullanabilen owner rolleri.', emoji: wency.ownerRole && wency.ownerRole.length > 0 ? '✅' : '❌' },
                    { label: 'Family Rolleri', value: 'familyRole_array', description: 'Family rolleri.', emoji: wency.familyRole && wency.familyRole.length > 0 ? '✅' : '❌' },
                    { label: 'Erkek Rolü', value: 'manRole_string', description: 'Erkek rolü. (Cinsiyet Sistemini açman gerekir.)', emoji: wency.manRole ? '✅' : '❌' },
                    { label: 'Kadın Rolü', value: 'womanRole_string', description: 'Kadın rolü. (Cinsiyet Sistemini açman gerekir.)', emoji: wency.womanRole ? '✅' : '❌' },
                    { label: 'Kayıtlı Rolü', value: 'registeredRole_string', description: 'Kayıtlı rolü.', emoji: wency.registeredRole ? '✅' : '❌' },
                    { label: 'Kayıtsız Rolü', value: 'unregisteredRole_string', description: 'Kayıtsız rolü.', emoji: wency.unregisteredRole ? '✅' : '❌' },
                ]));

        const channelRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setPlaceholder('Kanalları Güncellemek İçin Tıkla!')
                .setCustomId('channels')
                .addOptions([
                    { label: 'Bot Komut Kanalı', value: 'botCommandChannel_text', description: 'Botun komut aldığı kanal.', emoji: wency.botCommandChannel ? '✅' : '❌' },
                    { label: 'Komut Log Kanalı', value: 'commandLogChannel_text', description: 'Kullanılan bot komutlarının düşeceği kanal.', emoji: wency.commandLogChannel ? '✅' : '❌' },
                    { label: 'Invite Log Kanalı', value: 'inviteLogChannel_text', description: 'Sunucuya nasıl girildiğinin düşeceği kanal.', emoji: wency.inviteLogChannel ? '✅' : '❌' },
                    { label: 'Hoş Geldin Kanalı', value: 'welcomeChannel_text', description: 'Yeni gelen üyeye hoş geldin mesajının atılacağı kanal.', emoji: wency.welcomeChannel ? '✅' : '❌' },
                    { label: 'Coin Kanalı', value: 'coinChannel_text', description: 'Ship kanalı.', emoji: wency.coinChannel ? '✅' : '❌' },
                    { label: 'Ship Kanalı', value: 'shipChannel_text', description: 'Ship kanalı.', emoji: wency.shipChannel ? '✅' : '❌' },
                    { label: 'Tweet Kanalı', value: 'tweetChannel_text', description: 'Ship kanalı.', emoji: wency.tweetChannel ? '✅' : '❌' },
                    { label: 'Özel Oda Kanalı', value: 'secretRoomChannel_voice', description: 'Özel oda kanalı.', emoji: wency.secretRoomChannel ? '✅' : '❌' },
                    { label: 'Özel Oda Kategorisi', value: 'secretRoomParent_category', description: 'Özel oda kategorisi.', emoji: wency.secretRoomParent ? '✅' : '❌' },
                ]));

        const question = await message.reply(createSetupPanel(message, wency, [mainRow, systemRow, roleRow, channelRow]));

        const filter = (i) => i.user.id === message.author.id;
        const collector = question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 10,
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();

            if (i.customId === 'role-setup') {
                await roleSetup(message);
            }

            if (i.customId === 'emoji-setup') {
                await emojiSetup(message);
            }

            if (i.customId === 'log-setup') {
                await logSetup(message);
            }

            if (i.customId === 'roles') {
                await roles(message, wency, i.values[0], question, i);
            }

            if (i.customId === 'channels') {
                await channels(message, wency, i.values[0], question, i);
            }

            if (i.customId === 'systems') {
                await systems(message, wency, i.values[0], question, i);
            }
        });
    },
};

async function roles(message, wency, option, botMessage, i) {
    const [key, type] = option.split('_');
    const row = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('roleSelect')
            .setMaxValues(type === 'array' ? 20 : 1)
    );

    const msg = await message.channel.send({
        content: `Güncellemek için tıklayın.`,
        components: [row],
    });

    const roleCollector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 1000 * 60 * 10,
    });

    roleCollector.on('collect', async (i) => {
        await i.deferUpdate();
        if (i.customId === 'roleSelect') {
            wency[key] = type === 'string' ? i.values[0] : i.values;
            await Settings.updateOne({ id: message.guild.id }, { [key]: wency[key] }, { upsert: true });
            msg.edit({ content: `Başarıyla güncellendi!`, components: [] }).then((m) => setTimeout(() => m.delete(), 5000));

            refreshSetup(message, wency, botMessage);
        }
    });
}

async function channels(message, wency, option, botMessage, i) {

    const [key, type] = option.split('_');

    const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('channelSelect')
            .setMinValues(1)
            .setMaxValues(10)
            .setChannelTypes(
                type === 'voice'
                    ? [ChannelType.GuildVoice]
                    : type === 'text'
                        ? [ChannelType.GuildText]
                        : [ChannelType.GuildCategory]
            )
    );

    const msg = await message.channel.send({
        content: `Güncellemek için tıklayın.`,
        components: [row],
    });

    const channelCollector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 1000 * 60 * 10,
    });

    channelCollector.on('collect', async (i) => {

        await i.deferUpdate();

        if (i.customId === 'channelSelect') {

            wency[key] = i.values[0];

             await Settings.updateOne(
             { id: message.guild.id },
             { $set: { [key]: i.values[0] } },
             { upsert: true }
            );

            msg.edit({
                content: `Başarıyla güncellendi!`,
                components: []
            }).then((m) => setTimeout(() => m.delete(), 5000));

            refreshSetup(message, wency, botMessage);
        }
    });
}

async function systems(message, wency, option, botMessage, i) {
    wency[option] = !wency[option];
    const changes = { [option]: wency[option] };

    if (option === 'autoRole' && wency.autoRole) {
        wency.genderSystem = false;
        changes.genderSystem = false;
    }

    if (option === 'genderSystem' && wency.genderSystem) {
        wency.autoRole = false;
        changes.autoRole = false;
    }

    await Settings.updateOne({ id: message.guild.id }, { $set: changes }, { upsert: true });
    if (option === 'spamGuard') SpamGuard.setEnabled(message.guild.id, wency[option]);
    message.reply({ content: `${bold(systemLabels[option])} başarıyla ${wency[option] ? 'açıldı' : 'kapatıldı'}.` });
    refreshSetup(message, wency, botMessage);
}

async function roleSetup(message) {

    const roles = [
        { name: 'Gri', color: '#7a7a7a' },
        { name: 'Siyah', color: '#090909' },
        { name: 'Beyaz', color: '#f9f8f8' },
        { name: 'Kırmızı', color: '#f50606' },
        { name: 'Mavi', color: '#2a9dff' },
        { name: 'Sarı', color: '#dfdb6a' },
        { name: 'Yeşil', color: '#37be66' },
        { name: 'Mor', color: '#a47dff' },
        { name: 'Turuncu', color: '#e98c00' },
        { name: 'Pembe', color: '#e996ff' },
    ]

    roles.forEach(async (role) => {
        const guildRole = message.guild.roles.cache.find(r => r.name === role.name);
        if (guildRole) return;
        await message.guild.roles.create({ name: role.name, color: role.color });
    });

    message.reply({ content: 'Roller başarıyla oluşturuldu.' });
}

async function emojiSetup(message) {

    const emojis = [
        { name: 'wencyChange', url: 'https://cdn.discordapp.com/emojis/1280996856343826554.webp?size=80&quality=lossless' },
        { name: 'wencyLimit', url: 'https://cdn.discordapp.com/emojis/1280996757773222042.webp?size=80&quality=lossless' },
        { name: 'wencyLock', url: 'https://cdn.discordapp.com/emojis/1280996771169828944.webp?size=80&quality=lossless' },
        { name: 'wencyVisible', url: 'https://cdn.discordapp.com/emojis/1280996886119055462.webp?size=80&quality=lossless' },
        { name: 'wencyMember', url: 'https://cdn.discordapp.com/emojis/1280996814190809140.webp?size=80&quality=lossless' },
        { name: 'wencyInfo', url: 'https://img.icons8.com/ios-filled/100/ffffff/info.png' },
        { name: 'wencyDeny', url: 'https://img.icons8.com/ios-filled/100/ffffff/no-entry.png' },
        { name: 'wencyCrown', url: 'https://img.icons8.com/ios-filled/100/ffffff/crown.png' },
        { name: 'wencyTrash', url: 'https://img.icons8.com/ios-filled/100/ffffff/trash.png' },
        { name: 'wencyUp', url: 'https://cdn.discordapp.com/emojis/947134506488459274.gif?size=80&quality=lossless' },
        { name: 'wencyDown', url: 'https://cdn.discordapp.com/emojis/947134506672996382.gif?size=80&quality=lossless' },
        { name: 'point', url: 'https://cdn.discordapp.com/emojis/1057358625972178974.webp?size=40&quality=lossless' },
    ]

    emojis.forEach(async (e) => {
        const emoji = message.guild.emojis.cache.find(emoji => emoji.name === e.name);
        if (emoji) return;
        await message.guild.emojis.create({ attachment: e.url, name: e.name });
    });

    message.reply({ content: 'Emojiler başarıyla yüklendi.' });
}


async function logSetup(message) {
    const channels = [
        { name: 'guard-log' },
        { name: 'backup-log' },
        { name: 'ban-log' },
        { name: 'aff-log' },
        { name: 'mute-log' },
        { name: 'jail-log' },
        { name: 'mesaj-log' },
        { name: 'command-log', key: 'commandLogChannel' },
        { name: 'invite-log', key: 'inviteLogChannel' },
        { name: 'secret-log' },
        { name: 'voice-log' },
        { name: 'giriş-çıkış-log' },
        { name: 'rol-log' },
        { name: 'guild-log' },
        { name: 'emoji-log' },
    ];

    const categoryName = `${message.guild.name} | Logs`;
    let logsCategory = message.guild.channels.cache.find((channel) =>
        channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!logsCategory) {
        logsCategory = await message.guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
            position: 99,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        });
    } else {
        await logsCategory.permissionOverwrites.edit(message.guild.roles.everyone, {
            ViewChannel: false
        }).catch(() => null);
    }

    const updates = {};
    for (const channel of channels) {
        let logChannel = message.guild.channels.cache.find((item) =>
            item.type === ChannelType.GuildText && item.name === channel.name
        );
        if (logChannel) {
            if (logChannel.parentId !== logsCategory.id) {
                await logChannel.setParent(logsCategory.id, { lockPermissions: false }).catch(() => null);
            }
            if (channel.key) updates[channel.key] = logChannel.id;
            continue;
        }

        logChannel = await message.guild.channels.create({
            name: channel.name,
            type: ChannelType.GuildText,
            parent: logsCategory.id,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        });
        if (channel.key) updates[channel.key] = logChannel.id;
    }

    if (Object.keys(updates).length) {
        await Settings.updateOne({ id: message.guild.id }, { $set: updates }, { upsert: true });
    }

    message.reply({ content: 'Tüm log kanalları başarıyla kuruldu ve eksik kanallar tamamlandı.' });
}

async function refreshSetup(message, wency, botMessage) {

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role-setup').setLabel('Rol Kurulumu').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('emoji-setup').setLabel('Emoji Kurulumu').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('log-setup').setLabel('Log Kurulumu').setStyle(ButtonStyle.Secondary),
    );

    const systemRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setPlaceholder('Sistemleri & Ayarları Güncellemek İçin Tıkla!')
            .setCustomId('systems')
            .addOptions([
                { label: 'Otomatik Kayıt', value: 'autoRole', description: 'Sunucuya girene otomatik üye rolü verir.', emoji: wency.autoRole ? '✅' : '❌' },
                { label: 'Cinsiyetli Kayıt', value: 'genderSystem', description: 'Cinsiyetli kayıt sistemnini açar kapatır', emoji: wency.genderSystem ? '✅' : '❌' },
                { label: 'Link Engel', value: 'linkGuard', description: 'Link engel koruma açar kapatır.', emoji: wency.linkGuard ? '✅' : '❌' },
                { label: 'Spam Engel', value: 'spamGuard', description: 'Mesaj spam korumasını açar kapatır.', emoji: wency.spamGuard ? '✅' : '❌' },
                { label: 'Gif Engel', value: 'gifGuard', description: 'Gif engel korumasını açar kapatır.', emoji: wency.gifGuard ? '✅' : '❌' },
            ]));

    const roleRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setPlaceholder('Rolleri Güncellemek İçin Tıkla!')
            .setCustomId('roles')
            .addOptions([
                { label: 'Ban ve Jail Yetkilileri', value: 'banAuth_array', description: '(Ban, Jail)', emoji: wency.banAuth && wency.banAuth.length > 0 ? '✅' : '❌' },
                { label: 'Yetkililer', value: 'auth_array', description: '(Referans, Mute, Sil, Vip, Kilit, Say, Rol)', emoji: wency.auth && wency.auth.length > 0 ? '✅' : '❌' },
                { label: 'GIF İzinli Roller', value: 'gifAuthRole_array', description: 'GIF göndermesine izin verilen roller.', emoji: wency.gifAuthRole && wency.gifAuthRole.length > 0 ? '✅' : '❌' },
                { label: 'Vip Rolü', value: 'vipRole_string', description: 'Vip rolü.', emoji: wency.vipRole ? '✅' : '❌' },
                { label: 'Jail Rolü', value: 'jailRole_string', description: 'Jail verilen kullanıcıya uygulanacak rol.', emoji: wency.jailRole ? '✅' : '❌' },
                { label: 'Guild Tag Rolü', value: 'guildTagRole_string', description: 'Guild tag alan kullanıcıya verilecek rol.', emoji: wency.guildTagRole ? '✅' : '❌' },
                { label: 'Owner Rolleri', value: 'ownerRole_array', description: 'Kurucu komutlarını kullanabilen owner rolleri.', emoji: wency.ownerRole && wency.ownerRole.length > 0 ? '✅' : '❌' },
                { label: 'Family Rolleri', value: 'familyRole_array', description: 'Family rolleri.', emoji: wency.familyRole && wency.familyRole.length > 0 ? '✅' : '❌' },
                { label: 'Erkek Rolü', value: 'manRole_string', description: 'Erkek rolü. (Cinsiyet Sistemini açman gerekir.)', emoji: wency.manRole ? '✅' : '❌' },
                { label: 'Kadın Rolü', value: 'womanRole_string', description: 'Kadın rolü. (Cinsiyet Sistemini açman gerekir.)', emoji: wency.womanRole ? '✅' : '❌' },
                { label: 'Kayıtlı Rolü', value: 'registeredRole_string', description: 'Kayıtlı rolü.', emoji: wency.registeredRole ? '✅' : '❌' },
                { label: 'Kayıtsız Rolü', value: 'unregisteredRole_string', description: 'Kayıtsız rolü.', emoji: wency.unregisteredRole ? '✅' : '❌' },
            ]));

    const channelRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setPlaceholder('Kanalları Güncellemek İçin Tıkla!')
            .setCustomId('channels')
            .addOptions([
                { label: 'Bot Komut Kanalı', value: 'botCommandChannel_text', description: 'Botun komut aldığı kanal.', emoji: wency.botCommandChannel ? '✅' : '❌' },
                { label: 'Komut Log Kanalı', value: 'commandLogChannel_text', description: 'Kullanılan bot komutlarının düşeceği kanal.', emoji: wency.commandLogChannel ? '✅' : '❌' },
                { label: 'Invite Log Kanalı', value: 'inviteLogChannel_text', description: 'Sunucuya nasıl girildiğinin düşeceği kanal.', emoji: wency.inviteLogChannel ? '✅' : '❌' },
                { label: 'Hoş Geldin Kanalı', value: 'welcomeChannel_text', description: 'Yeni gelen üyeye hoş geldin mesajının atılacağı kanal.', emoji: wency.welcomeChannel ? '✅' : '❌' },
                { label: 'Coin Kanalı', value: 'coinChannel_text', description: 'Ship kanalı.', emoji: wency.coinChannel ? '✅' : '❌' },
                { label: 'Ship Kanalı', value: 'shipChannel_text', description: 'Ship kanalı.', emoji: wency.shipChannel ? '✅' : '❌' },
                { label: 'Tweet Kanalı', value: 'tweetChannel_text', description: 'Ship kanalı.', emoji: wency.tweetChannel ? '✅' : '❌' },
                { label: 'Özel Oda Kanalı', value: 'secretRoomChannel_voice', description: 'Özel oda kanalı.', emoji: wency.secretRoomChannel ? '✅' : '❌' },
                { label: 'Özel Oda Kategorisi', value: 'secretRoomParent_category', description: 'Özel oda kategorisi.', emoji: wency.secretRoomParent ? '✅' : '❌' },
            ]));

    const embed = new EmbedBuilder({
        author: { name: message.guild.name, iconURL: message.guild.iconURL() },
        footer: { text: 'Created By Wency', iconURL: message.guild.iconURL() },
        description: [
            `${codeBlock('fix', '# Kurulum Seçenekleri')}`,
            `• Rol Kurulumu : Sunucu rollerini otomatik oluşturur`,
            `• Emoji Kurulumu : Gerekli emojileri yükler`,
            `• Log Kurulumu : Log kanallarını ayarlar`,
            '',
            `${codeBlock('fix', '# Sistem Durumu')}`,
            `${wency.autoRole ? '✅' : '❌'} Otomatik Rol : ${wency.autoRole ? 'Aktif' : 'Devre Dışı'}`,
            `${wency.genderSystem ? '✅' : '❌'} Cinsiyet Sistemi : ${wency.genderSystem ? 'Aktif' : 'Devre Dışı'}`,
            `${wency.linkGuard ? '✅' : '❌'} Link Engel : ${wency.linkGuard ? 'Aktif' : 'Devre Dışı'}`,
            `${wency.spamGuard ? '✅' : '❌'} Spam Engel : ${wency.spamGuard ? 'Aktif' : 'Devre Dışı'}`,
            `${wency.gifGuard ? '✅' : '❌'} Gif Engel : ${wency.gifGuard ? 'Aktif' : 'Devre Dışı'}`,
            '',
            `${codeBlock('fix', '# Sunucu İstatistikleri')}`,
            `• Toplam Üye : ${message.guild.memberCount}`,
            `• Toplam Rol : ${message.guild.roles.cache.size}`,
            `• Toplam Kanal : ${message.guild.channels.cache.size}`,
        ].join('\n'),
    });

    await botMessage.edit(createSetupPanel(message, wency, [mainRow, systemRow, roleRow, channelRow]));
}

function createSetupPanel(message, wency, rows) {
    const content = [
        `# ${message.guild.name} Kurulum Paneli`,
        '',
        `${codeBlock('fix', '# Kurulum Seçenekleri')}`,
        '• Rol Kurulumu : Sunucu rollerini otomatik oluşturur',
        '• Emoji Kurulumu : Gerekli emojileri yükler',
        '• Log Kurulumu : Tüm log kanallarını otomatik kurar',
        '',
        `${codeBlock('fix', '# Sistem Durumu')}`,
        `${wency.autoRole ? '✅' : '❌'} Otomatik Rol : ${wency.autoRole ? 'Aktif' : 'Devre Dışı'}`,
        `${wency.genderSystem ? '✅' : '❌'} Cinsiyet Sistemi : ${wency.genderSystem ? 'Aktif' : 'Devre Dışı'}`,
        `${wency.linkGuard ? '✅' : '❌'} Link Engel : ${wency.linkGuard ? 'Aktif' : 'Devre Dışı'}`,
        `${wency.spamGuard ? '✅' : '❌'} Spam Engel : ${wency.spamGuard ? 'Aktif' : 'Devre Dışı'}`,
        `${wency.gifGuard ? '✅' : '❌'} Gif Engel : ${wency.gifGuard ? 'Aktif' : 'Devre Dışı'}`,
        '',
        `${codeBlock('fix', '# Sunucu İstatistikleri')}`,
        `• Toplam Üye : ${message.guild.memberCount}`,
        `• Toplam Rol : ${message.guild.roles.cache.size}`,
        `• Toplam Kanal : ${message.guild.channels.cache.size}`,
        '',
        '-# Created By Wency',
    ].join('\n');

    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    rows.forEach((row) => container.addActionRowComponents(row));

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    };
}
