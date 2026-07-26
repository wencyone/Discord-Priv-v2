const { hasOwnerRole } = require('../../../Base/OwnerRole');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    ModalBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    bold,
    inlineCode,
} = require('discord.js');
const Settings = require('../../../Schema/Settings');
const Punishment = require('../../../Schema/Punishment');
const { getPrimaryGuildData, releaseBannedGuildTagJail } = require('../../../Base/BannedGuildTag');

module.exports = {
    name: 'yasaklitag',
    aliases: ['gtag', 'yasaklıtag', 'ytag'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        const action = args[0]?.toLocaleLowerCase('tr-TR');
        if (!action) return showDashboard(client, message);
        if (action === 'liste' || action === 'list') return showList(message);
        if (action === 'ekle' || action === 'add') return addGuildTag(client, message, args[1]);
        if (['sil', 'çıkar', 'cikar', 'kaldır', 'kaldir', 'remove'].includes(action)) return removeGuildTag(client, message, args[1]);
        if (/^\d{17,22}$/.test(action)) return addGuildTag(client, message, action);

        return message.reply(createPanel(['❌ **Geçersiz İşlem**', 'Geçerli işlemler: `ekle`, `çıkar`, `liste`']));
    }
};

async function showDashboard(client, message) {
    const settings = await Settings.findOne({ id: message.guild.id }).lean();
    const list = Array.isArray(settings?.bannedGuildTags) ? settings.bannedGuildTags : [];
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gtag:add').setLabel('Yasaklı Tag Ekle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gtag:remove').setLabel('Yasaklı Tag Çıkar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('gtag:list').setLabel('Yasaklı Tag Liste').setStyle(ButtonStyle.Secondary),
    );
    const question = await message.channel.send(createPanel([
        `${message.author} yasaklı guild tag yönetim paneline hoş geldin.`,
        `› ${bold('Yasaklı Guild Tag Özeti')}\n• Toplam Kayıt: ${inlineCode(String(list.length))}`,
    ], [row]));

    const interaction = await question.awaitMessageComponent({
        filter: (item) => item.user.id === message.author.id && item.customId.startsWith('gtag:'),
        time: 60000,
    }).catch(() => null);
    if (!interaction) return question.edit(createPanel(['❌ **İşlem Süresi Doldu**', 'Panel kapatıldı.'])).catch(() => null);

    if (interaction.customId === 'gtag:list') {
        await interaction.deferUpdate();
        return showList(message, question);
    }

    const mode = interaction.customId === 'gtag:add' ? 'add' : 'remove';
    const modalId = `gtag:${mode}:modal:${interaction.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(mode === 'add' ? 'Yasaklı Guild Tag Ekle' : 'Yasaklı Guild Tag Çıkar')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('guildId')
                .setLabel('Sunucu ID')
                .setPlaceholder('123456789012345678')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));
    await interaction.showModal(modal);
    const submitted = await interaction.awaitModalSubmit({
        filter: (item) => item.user.id === message.author.id && item.customId === modalId,
        time: 60000,
    }).catch(() => null);
    if (!submitted) return question.edit(createPanel(['❌ **İşlem Süresi Doldu**', 'Panel kapatıldı.'])).catch(() => null);

    await submitted.deferUpdate();
    const guildId = submitted.fields.getTextInputValue('guildId').trim();
    if (mode === 'add') return addGuildTag(client, message, guildId, question);
    return removeGuildTag(client, message, guildId, question);
}

async function addGuildTag(client, message, guildId, panelMessage = null) {
    if (!/^\d{17,22}$/.test(guildId || '')) return sendPanel(message, panelMessage, ['❌ **Geçersiz Sunucu ID**', '17-22 haneli bir sunucu ID belirtmelisin.']);

    const settings = await Settings.findOne({ id: message.guild.id });
    const list = Array.isArray(settings?.bannedGuildTags) ? settings.bannedGuildTags : [];
    if (list.some((entry) => entry.guildId === guildId)) {
        return sendPanel(message, panelMessage, ['❌ **Kayıt Zaten Mevcut**', `${inlineCode(guildId)} zaten yasaklı guild tag listesinde.`]);
    }

    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    const commandUser = await client.users.fetch(message.author.id, { force: true }).catch(() => message.author);
    const primaryGuild = getPrimaryGuildData(commandUser);
    const tag = primaryGuild?.guildId === guildId && primaryGuild.identityEnabled !== false ? primaryGuild.tag : '';
    const data = { guildId, name: guild?.name || '', tag: tag || '', addedBy: message.author.id, addedAt: Date.now() };

    await Settings.updateOne({ id: message.guild.id }, { $push: { bannedGuildTags: data } }, { upsert: true });
    return sendPanel(message, panelMessage, [
        '✅ **Yasaklı Guild Tag Eklendi**',
        `• Sunucu: ${bold(data.name || 'Bilinmeyen Sunucu')}\n• ID: ${inlineCode(guildId)}${data.tag ? `\n• Tag: ${inlineCode(data.tag)}` : ''}`,
    ]);
}

async function removeGuildTag(client, message, guildId, panelMessage = null) {
    if (!/^\d{17,22}$/.test(guildId || '')) return sendPanel(message, panelMessage, ['❌ **Geçersiz Sunucu ID**', '17-22 haneli bir sunucu ID belirtmelisin.']);

    const settings = await Settings.findOne({ id: message.guild.id });
    const exists = settings?.bannedGuildTags?.some((entry) => entry.guildId === guildId);
    if (!exists) return sendPanel(message, panelMessage, ['❌ **Kayıt Bulunamadı**', `${inlineCode(guildId)} yasaklı listede değil.`]);

    await Settings.updateOne({ id: message.guild.id }, { $pull: { bannedGuildTags: { guildId } } });
    const punishments = await Punishment.find({
        guildId: message.guild.id,
        type: 'jail',
        source: 'bannedGuildTag',
        bannedGuildId: guildId,
        active: true,
    });
    for (const punishment of punishments) {
        const member = await message.guild.members.fetch(punishment.userId).catch(() => null);
        if (member) await releaseBannedGuildTagJail(client, member, settings, punishment).catch(() => null);
    }

    return sendPanel(message, panelMessage, ['✅ **Yasaklı Guild Tag Çıkarıldı**', `${inlineCode(guildId)} listeden kaldırıldı.`]);
}

async function showList(message, panelMessage = null) {
    const settings = await Settings.findOne({ id: message.guild.id }).lean();
    const list = Array.isArray(settings?.bannedGuildTags) ? settings.bannedGuildTags : [];
    const content = list.length
        ? list.slice(0, 50).map((entry, index) => `${inlineCode(`${index + 1}.`)} ${bold(entry.name || 'Bilinmeyen Sunucu')} • ${inlineCode(entry.guildId)}${entry.tag ? ` • ${inlineCode(entry.tag)}` : ''}`).join('\n')
        : 'Yasaklı guild tag listesi boş.';
    return sendPanel(message, panelMessage, [
        `› ${bold('Yasaklı Guild Tag Listesi')}`,
        `• Toplam ${inlineCode(String(list.length))} kayıt görüntüleniyor.`,
        content,
    ]);
}

function createPanel(sections, rows = []) {
    const container = new ContainerBuilder().setAccentColor(0xfee75c);
    sections.filter(Boolean).forEach((section, index, array) => {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(section));
        if (index < array.length - 1 || rows.length) {
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }
    });
    rows.forEach((row) => container.addActionRowComponents(row));
    return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [], users: [], roles: [] } };
}

function sendPanel(message, panelMessage, sections) {
    const payload = createPanel(sections);
    return panelMessage ? panelMessage.edit(payload) : message.reply(payload);
}
