const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    PermissionFlagsBits,
    PermissionsBitField,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    bold,
    inlineCode,
} = require('discord.js');
const { roleBackup, channelBackup } = require('../../../Utils/Functions');
const Settings = require('../../../../Schema/GuardSettings');
const { emojis, panel, wait, expired } = require('../../Panel');

module.exports = {
    name: 'ayarlar',
    aliases: ['settings'],

    execute: async (client, message) => {
        const { arrow, point } = await emojis(client);
        const menu = new StringSelectMenuBuilder()
            .setCustomId('settings:menu')
            .setPlaceholder('Yönetilecek ayarı seç')
            .addOptions([
                { label: 'Kanal Yedeği', description: 'Kanal yedeğini şimdi güncelle', value: 'channel_backup', emoji: '🔄' },
                { label: 'Rol Yedeği', description: 'Rol ve üye yedeğini şimdi güncelle', value: 'role_backup', emoji: '🔄' },
                { label: 'Blacklist Rolleri', description: 'Korunan rolleri yönet', value: 'blacklist_roles', emoji: '🛡️' },
                { label: 'Blacklist Kanalları', description: 'Korunan kanalları yönet', value: 'blacklist_channels', emoji: '🛡️' },
                { label: 'Yetki İşlemleri', description: 'Tehlikeli rol yetkilerini yönet', value: 'authority_operations', emoji: '⚙️' },
            ]);

        const question = await message.channel.send(panel([
            `${message.author} sunucu güvenlik ayarları paneline hoş geldin.\nYönetmek istediğin işlemi aşağıdaki menüden seçebilirsin.`,
            `${arrow} ${bold('Güvenlik Ayarları')}\n${point} Yedekleme, blacklist ve yetki işlemleri bu panelden yönetilir.`,
        ], [new ActionRowBuilder().addComponents(menu)]));

        const interaction = await wait(question, message.author.id, ['settings:menu']);
        if (!interaction) return expired(question, client);
        await interaction.deferUpdate();

        const action = interaction.values[0];
        if (action === 'channel_backup') return runBackup(client, message, question, 'channel');
        if (action === 'role_backup') return runBackup(client, message, question, 'role');
        if (action === 'blacklist_roles') return manageBlacklist(client, message, question, 'role');
        if (action === 'blacklist_channels') return manageBlacklist(client, message, question, 'channel');
        if (action === 'authority_operations') return manageAuthorities(client, message, question);
    }
};

async function runBackup(client, message, question, type) {
    const { arrow, point, check } = await emojis(client);
    await question.edit(panel([
        `${arrow} ${bold(type === 'role' ? 'Rol Yedeği Güncelleniyor' : 'Kanal Yedeği Güncelleniyor')}`,
        `${point} Sunucu verileri işleniyor. İşlem tamamlanana kadar bekle.`,
    ]));

    if (type === 'role') await roleBackup(message.guild);
    else await channelBackup(message.guild);

    return question.edit(panel([
        `${check} ${bold(type === 'role' ? 'Rol Yedeği Güncellendi' : 'Kanal Yedeği Güncellendi')}`,
        `${point} ${type === 'role' ? 'Roller ve rol üyeleri' : 'Kanallar ve kanal izinleri'} başarıyla yedeklendi.`,
    ]));
}


async function manageBlacklist(client, message, question, type) {
    const { arrow, point, check, mark } = await emojis(client);
    const data = await Settings.findOne({ guildID: message.guild.id });
    const path = type === 'role' ? 'blackListedRoles' : 'blackListedChannels';
    const stored = type === 'role' ? data?.blackListedRoles : data?.blackListedChannels;
    const ids = (stored || []).map((item) => String(item?.id || item)).filter(Boolean);
    const isRole = type === 'role';

    const removeMenu = new StringSelectMenuBuilder()
        .setCustomId(`settings:blacklist:${type}:remove`)
        .setPlaceholder(`${isRole ? 'Rol' : 'Kanal'} kaldır`)
        .setDisabled(ids.length === 0)
        .addOptions(ids.length ? ids.slice(0, 25).map((id) => ({
            label: isRole
                ? message.guild.roles.cache.get(id)?.name || 'Silinmiş rol'
                : message.guild.channels.cache.get(id)?.name || 'Silinmiş kanal',
            description: 'Blacklist kaydından kaldır',
            value: id,
        })) : [{ label: 'Kayıt bulunamadı', value: 'none' }]);

    const addMenu = isRole
        ? new RoleSelectMenuBuilder().setCustomId(`settings:blacklist:${type}:add`).setPlaceholder('Blacklist rolü ekle').setMinValues(1).setMaxValues(25)
        : new ChannelSelectMenuBuilder().setCustomId(`settings:blacklist:${type}:add`).setPlaceholder('Blacklist kanalı ekle').setMinValues(1).setMaxValues(25);

    await question.edit(panel([
        `${arrow} ${bold(isRole ? 'Blacklist Rolleri' : 'Blacklist Kanalları')}`,
        `${point} Kayıtlı öğe: ${inlineCode(String(ids.length))}\n${point} Üst menü kayıt kaldırır, alt menü yeni kayıt ekler.`,
    ], [
        new ActionRowBuilder().addComponents(removeMenu),
        new ActionRowBuilder().addComponents(addMenu),
    ]));

    const interaction = await wait(question, message.author.id, [
        `settings:blacklist:${type}:remove`,
        `settings:blacklist:${type}:add`,
    ]);
    if (!interaction) return expired(question, client);
    await interaction.deferUpdate();

    if (interaction.customId.endsWith(':remove')) {
        const id = interaction.values[0];
        await Settings.updateOne({ guildID: message.guild.id }, { $set: { [path]: ids.filter((storedId) => storedId !== id).map((storedId) => ({ id: storedId })) } });
        return question.edit(panel([
            `${check} ${bold('Blacklist Kaydı Kaldırıldı')}`,
            `${point} <@${isRole ? '&' : '#'}${id}> koruma listesinden çıkarıldı.`,
        ]));
    }

    const uniqueIds = [...new Set(interaction.values)].filter((id) => !ids.includes(id));
    if (!uniqueIds.length) {
        return question.edit(panel([
            `${mark} ${bold('Yeni Kayıt Bulunamadı')}`,
            `${point} Seçilen öğelerin tamamı zaten blacklist içinde.`,
        ]));
    }

    await Settings.updateOne(
        { guildID: message.guild.id },
        { $set: { [path]: [...ids, ...uniqueIds].map((id) => ({ id })) } },
        { upsert: true }
    );
    return question.edit(panel([
        `${check} ${bold('Blacklist Güncellendi')}`,
        `${point} ${inlineCode(String(uniqueIds.length))} ${isRole ? 'rol' : 'kanal'} koruma listesine eklendi.`,
    ]));
}

async function manageAuthorities(client, message, question) {
    const { arrow, point, check } = await emojis(client);
    const document = await Settings.findOne({ guildID: message.guild.id });
    const savedPermissions = document?.rolePermissions || [];
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('settings:authority:open')
            .setLabel('Yetkileri Aç')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(savedPermissions.length === 0),
        new ButtonBuilder()
            .setCustomId('settings:authority:close')
            .setLabel('Yetkileri Kapat')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(savedPermissions.length > 0),
    );

    await question.edit(panel([
        `${arrow} ${bold('Tehlikeli Rol Yetkileri')}`,
        `${point} Kayıtlı yetki yedeği: ${inlineCode(String(savedPermissions.length))}\n${point} Yönetici ve sunucu yönetim yetkileri güvenli biçimde açılıp kapatılır.`,
    ], [row]));

    const interaction = await wait(question, message.author.id, ['settings:authority:open', 'settings:authority:close']);
    if (!interaction) return expired(question, client);
    await interaction.deferUpdate();

    if (interaction.customId === 'settings:authority:open') {
        for (const saved of savedPermissions) {
            const role = message.guild.roles.cache.get(saved.role);
            if (!role?.editable) continue;
            await role.setPermissions(new PermissionsBitField(saved.permissions)).catch(() => null);
        }
        await Settings.updateOne({ guildID: message.guild.id }, { $set: { 'rolePermissions': [] } });
        return question.edit(panel([
            `${check} ${bold('Rol Yetkileri Açıldı')}`,
            `${point} ${inlineCode(String(savedPermissions.length))} rolün kayıtlı yetkileri geri yüklendi.`,
        ]));
    }

    const dangerousPermissions = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageWebhooks,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers,
    ];
    const dangerousRoles = message.guild.roles.cache.filter((role) =>
        role.editable && dangerousPermissions.some((permission) => role.permissions.has(permission))
    );
    const permissions = [];

    for (const role of dangerousRoles.values()) {
        permissions.push({ role: role.id, permissions: role.permissions.bitfield.toString() });
        await role.setPermissions(PermissionsBitField.Flags.SendMessages).catch(() => null);
    }
    await Settings.updateOne(
        { guildID: message.guild.id },
        { $set: { 'rolePermissions': permissions } },
        { upsert: true }
    );
    return question.edit(panel([
        `${check} ${bold('Tehlikeli Yetkiler Kapatıldı')}`,
        `${point} ${inlineCode(String(permissions.length))} rolün yetkileri yedeklenip güvenli duruma getirildi.`,
    ]));
}
