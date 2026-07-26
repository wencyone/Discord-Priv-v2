const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Constants,
    ContainerBuilder,
    MessageFlags,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const BoosterRole = require('../Schema/BoosterRole');

const SUSPEND_TIME = 3 * 24 * 60 * 60 * 1000;
const SPECIAL_ROLES_ANCHOR = '⸻Special Roles⸻';
const HOLOGRAPHIC_STYLE = Constants?.HolographicStyle || {
    Primary: 0xe99dff,
    Secondary: 0xa179ff,
    Tertiary: 0x5c7cfa,
};
const SOLID_COLORS = [
    { label: 'Teal', value: '1abc9c', emoji: '🟩' },
    { label: 'Green', value: '2ecc71', emoji: '🟩' },
    { label: 'Blue', value: '3498db', emoji: '🟦' },
    { label: 'Purple', value: '9b59b6', emoji: '🟪' },
    { label: 'Pink', value: 'e91e63', emoji: '🟥' },
    { label: 'Yellow', value: 'f1c40f', emoji: '🟨' },
    { label: 'Orange', value: 'e67e22', emoji: '🟧' },
    { label: 'Red', value: 'e74c3c', emoji: '🟥' },
    { label: 'Grey', value: '95a5a6', emoji: '⬜' },
    { label: 'Slate', value: '607d8b', emoji: '⬛' },
    { label: 'Dark Teal', value: '11806a', emoji: '🟩' },
    { label: 'Dark Green', value: '1f8b4c', emoji: '🟩' },
    { label: 'Dark Blue', value: '206694', emoji: '🟦' },
    { label: 'Dark Purple', value: '71368a', emoji: '🟪' },
    { label: 'Dark Pink', value: 'ad1457', emoji: '🟥' },
    { label: 'Dark Gold', value: 'c27c0e', emoji: '🟨' },
    { label: 'Dark Orange', value: 'a84300', emoji: '🟧' },
    { label: 'Dark Red', value: '992d22', emoji: '🟥' },
    { label: 'Light Grey', value: '979c9f', emoji: '⬜' },
    { label: 'Dark Slate', value: '546e7a', emoji: '⬛' },
];
const GRADIENT_COLORS = [
    { label: 'Pink -> Purple', value: 'ff73fa:9b59b6', emoji: '🎨' },
    { label: 'Blue -> Purple', value: '3498db:9b59b6', emoji: '🎨' },
    { label: 'Red -> Orange', value: 'ed4245:e67e22', emoji: '🎨' },
    { label: 'Teal -> Blue', value: '1abc9c:3498db', emoji: '🎨' },
    { label: 'Green -> Yellow', value: '2ecc71:f1c40f', emoji: '🎨' },
    { label: 'Pink -> Red', value: 'ff73fa:ed4245', emoji: '🎨' },
];

function isBooster(member) {
    return Boolean(member?.premiumSinceTimestamp || member?.premiumSince);
}

function findSpecialRolesAnchor(guild) {
    return guild.roles.cache
        .filter((role) => role.name === SPECIAL_ROLES_ANCHOR)
        .sort((a, b) => b.position - a.position)
        .first() || null;
}

async function getOwnedRole(interaction, requireBoost = true) {
    if (requireBoost && !isBooster(interaction.member)) {
        await replyInteraction(interaction, { content: 'Bu sistemi yalnızca aktif boost basan üyeler kullanabilir.', flags: 64 }).catch(() => null);
        return null;
    }

    const document = await BoosterRole.findOne({ guildId: interaction.guild.id, ownerId: interaction.user.id });
    if (!document) {
        await replyInteraction(interaction, { content: 'Önce kendine ait bir booster rolü oluşturmalısın.', flags: 64 }).catch(() => null);
        return null;
    }
    const role = interaction.guild.roles.cache.get(document.roleId) || await interaction.guild.roles.fetch(document.roleId).catch(() => null);
    if (!role) {
        await BoosterRole.deleteOne({ _id: document._id });
        await replyInteraction(interaction, { content: 'Booster rolün sunucuda bulunamadı. Yeniden oluşturabilirsin.', flags: 64 }).catch(() => null);
        return null;
    }
    await removeSharedMembers(interaction.guild, role, document);
    return { document, role };
}

async function handleBoosterRoleInteraction(client, interaction) {
    if (!interaction.inGuild() || !interaction.customId.startsWith('booster-role:')) return false;
    const action = interaction.customId.split(':')[1];

    if (action === 'create') {
        await createRole(interaction);
        return true;
    }
    if (action === 'edit') {
        await editRole(interaction);
        return true;
    }
    if (action === 'color') {
        await showColorMenu(interaction);
        return true;
    }
    if (action === 'color-solid') {
        await showSolidColorMenu(interaction);
        return true;
    }
    if (action === 'color-gradient') {
        await showGradientColorMenu(interaction);
        return true;
    }
    if (action === 'color-custom') {
        await showCustomColorModal(interaction);
        return true;
    }
    if (action === 'color-holographic') {
        await applyColor(interaction, 'holographic');
        return true;
    }
    if (action === 'color-select-solid') {
        await applyColor(interaction, `solid:${interaction.values[0]}`);
        return true;
    }
    if (action === 'color-select-gradient') {
        await applyColor(interaction, `gradient:${interaction.values[0]}`);
        return true;
    }
    if (action === 'delete') {
        await showDeleteConfirmation(interaction);
        return true;
    }
    if (action === 'delete-confirm') {
        await deleteOwnedRole(interaction);
        return true;
    }
    if (action === 'delete-cancel') {
        await interaction.update(ephemeralPanel(['❌ **Silme İşlemi İptal Edildi**']));
        return true;
    }
    await interaction.reply({ content: 'Bu booster rol işlemi artık kullanılamaz.', flags: 64 }).catch(() => null);
    return true;
}

async function createRole(interaction) {
    if (!isBooster(interaction.member)) return interaction.reply({ content: 'Bu sistemi yalnızca aktif boost basan üyeler kullanabilir.', flags: 64 });
    const existing = await BoosterRole.findOne({ guildId: interaction.guild.id, ownerId: interaction.user.id });
    if (existing) return interaction.reply({ content: 'Zaten kendine ait bir booster rolün bulunuyor.', flags: 64 });

    const anchor = findSpecialRolesAnchor(interaction.guild);
    const botRole = interaction.guild.members.me.roles.highest;
    if (!anchor) return interaction.reply({ content: `\`${SPECIAL_ROLES_ANCHOR}\` ayırıcı rolü bulunamadı.`, flags: 64 });
    if (anchor.position >= botRole.position) return interaction.reply({ content: `Bot rolü \`${SPECIAL_ROLES_ANCHOR}\` rolünün üstünde olmalı.`, flags: 64 });

    const modalId = `booster-role:create-modal:${interaction.id}`;
    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Booster Rolü Oluştur').addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('name').setLabel('Rol Adı').setMinLength(2).setMaxLength(50).setStyle(TextInputStyle.Short).setRequired(true)
        )
    );
    await interaction.showModal(modal);
    const submitted = await interaction.awaitModalSubmit({
        filter: (item) => item.user.id === interaction.user.id && item.customId === modalId,
        time: 120000,
    }).catch(() => null);
    if (!submitted) return;

    await submitted.deferReply({ flags: 64 });
    const name = submitted.fields.getTextInputValue('name').trim();
    let role;
    try {
        role = await interaction.guild.roles.create({
            name,
            colors: { primaryColor: 0xff73fa },
            permissions: [],
            mentionable: false,
            hoist: false,
            reason: `Booster özel rolü | ${interaction.user.id}`,
        });
        await role.setPosition(Math.max(1, anchor.position - 1));
        await interaction.member.roles.add(role);
        await BoosterRole.create({ guildId: interaction.guild.id, ownerId: interaction.user.id, roleId: role.id });
        await submitted.editReply({ content: `${role} booster rolün oluşturuldu ve ${SPECIAL_ROLES_ANCHOR} bölümünün altına yerleştirildi.` });
    } catch (error) {
        if (role) await role.delete().catch(() => null);
        await submitted.editReply({ content: `Rol oluşturulamadı: ${error.message}` });
    }
}

async function editRole(interaction) {
    const data = await getOwnedRole(interaction);
    if (!data) return;
    const modalId = `booster-role:edit-modal:${interaction.id}`;
    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Booster Rolünü Düzenle').addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('name').setLabel('Yeni Rol Adı').setValue(data.role.name.slice(0, 50)).setMinLength(2).setMaxLength(50).setStyle(TextInputStyle.Short).setRequired(true)
        )
    );
    await interaction.showModal(modal);
    const submitted = await interaction.awaitModalSubmit({ filter: (item) => item.user.id === interaction.user.id && item.customId === modalId, time: 120000 }).catch(() => null);
    if (!submitted) return;
    const name = submitted.fields.getTextInputValue('name').trim();
    await data.role.setName(name, `Booster rol düzenleme | ${interaction.user.id}`).catch(() => null);
    return submitted.reply({ content: `Rol adın **${name}** olarak güncellendi.`, flags: 64 });
}

async function showColorMenu(interaction) {
    const data = await getOwnedRole(interaction);
    if (!data) return;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('booster-role:color-solid').setLabel('Solid').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('booster-role:color-gradient').setLabel('Gradient').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('booster-role:color-holographic').setLabel('Holographic').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('booster-role:color-custom').setLabel('Kod').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply(ephemeralPanel([
        '## Role Style',
        `${data.role} rolün için renk stilini seç.`,
        'Solid normal renkler içindir. Gradient, Holographic ve Kod seçenekleri Discord rol stili destekliyorsa uygulanır.',
    ], [row]));
}

async function showSolidColorMenu(interaction) {
    const data = await getOwnedRole(interaction);
    if (!data) return;
    const menu = new StringSelectMenuBuilder()
        .setCustomId('booster-role:color-select-solid')
        .setPlaceholder('Normal rol rengini seç')
        .addOptions(SOLID_COLORS.map((color) => ({
            label: color.label,
            value: color.value,
            emoji: color.emoji,
            description: `#${color.value.toUpperCase()}`,
        })));

    return interaction.update(ephemeralPanel([
        '## Role colour',
        'Normal renklerden birini seç.',
    ], [new ActionRowBuilder().addComponents(menu)]));
}

async function showGradientColorMenu(interaction) {
    const data = await getOwnedRole(interaction);
    if (!data) return;
    const menu = new StringSelectMenuBuilder()
        .setCustomId('booster-role:color-select-gradient')
        .setPlaceholder('Gradient rol rengini seç')
        .addOptions(GRADIENT_COLORS.map((color) => ({
            label: color.label,
            value: color.value,
            emoji: color.emoji,
            description: color.value.split(':').map((hex) => `#${hex.toUpperCase()}`).join(' -> '),
        })));

    return interaction.update(ephemeralPanel([
        '## Gradient',
        'Gradient rol stilini seç.',
    ], [new ActionRowBuilder().addComponents(menu)]));
}

async function showCustomColorModal(interaction) {
    const data = await getOwnedRole(interaction);
    if (!data) return;

    const modalId = `booster-role:color-custom-modal:${interaction.id}`;
    const modal = new ModalBuilder().setCustomId(modalId).setTitle('Rol Renk Kodu').addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('primary')
                .setLabel('Solid renk veya gradient ilk renk')
                .setPlaceholder('#5865F2')
                .setMinLength(6)
                .setMaxLength(7)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('secondary')
                .setLabel('Gradient ikinci renk')
                .setPlaceholder('#EB459E')
                .setMinLength(6)
                .setMaxLength(7)
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
        )
    );

    await interaction.showModal(modal);
    const submitted = await interaction.awaitModalSubmit({
        filter: (item) => item.user.id === interaction.user.id && item.customId === modalId,
        time: 120000,
    }).catch(() => null);
    if (!submitted) return;

    const primary = normalizeHex(submitted.fields.getTextInputValue('primary'));
    const secondaryRaw = submitted.fields.getTextInputValue('secondary');
    const secondary = secondaryRaw ? normalizeHex(secondaryRaw) : null;

    if (!primary || (secondaryRaw && !secondary)) {
        return submitted.reply(ephemeralPanel(['❌ **Geçersiz Renk Kodu**', 'Renk kodunu `#5865F2` veya `5865F2` şeklinde yazmalısın.']));
    }

    const value = secondary ? `gradient:${primary}:${secondary}` : `solid:${primary}`;
    return applyColor(submitted, value, true);
}

async function applyColor(interaction, selectedValue, isModal = false) {
    const data = await getOwnedRole(interaction);
    if (!data) return;
    const value = selectedValue || interaction.values?.[0];
    let colors;
    if (value === 'holographic') {
        colors = { primaryColor: HOLOGRAPHIC_STYLE.Primary, secondaryColor: HOLOGRAPHIC_STYLE.Secondary, tertiaryColor: HOLOGRAPHIC_STYLE.Tertiary };
    } else {
        const [type, primary, secondary] = value.split(':');
        colors = { primaryColor: parseInt(primary, 16) };
        if (type === 'gradient') colors.secondaryColor = parseInt(secondary, 16);
    }
    try {
        if (typeof data.role.setColors === 'function') {
            await data.role.setColors(colors, `Booster rol rengi | ${interaction.user.id}`);
        } else if (!colors.secondaryColor && !colors.tertiaryColor) {
            await data.role.setColor(colors.primaryColor, `Booster rol rengi | ${interaction.user.id}`);
        } else {
            throw new Error('Role styles are not supported by this discord.js version.');
        }
        const payload = ephemeralPanel(['✅ **Rol Rengi Güncellendi**', `${data.role} rolünün rengi/stili başarıyla değiştirildi.`]);
        return isModal ? interaction.reply(payload) : interaction.update(payload);
    } catch (error) {
        const payload = ephemeralPanel(['❌ **Renk Uygulanamadı**', 'Gradient ve holographic stiller Discord rol stili desteğine bağlıdır.']);
        return isModal ? interaction.reply(payload) : interaction.update(payload);
    }
}

function normalizeHex(value) {
    const hex = String(value || '').trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return hex.toLowerCase();
}

async function showDeleteConfirmation(interaction) {
    const data = await getOwnedRole(interaction, false);
    if (!data) return;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('booster-role:delete-confirm').setLabel('Evet, Sil').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('booster-role:delete-cancel').setLabel('İptal').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply(ephemeralPanel(['🗑️ **Booster Rolünü Sil**', 'Booster rolün kalıcı olarak silinecek.'], [row]));
}

async function deleteOwnedRole(interaction) {
    const data = await getOwnedRole(interaction, false);
    if (!data) return;
    await data.role.delete(`Booster rol silme | ${interaction.user.id}`).catch(() => null);
    await BoosterRole.deleteOne({ _id: data.document._id });
    return interaction.update(ephemeralPanel(['✅ **Booster Rolü Silindi**']));
}

async function suspendBoosterRole(guild, memberId) {
    const document = await BoosterRole.findOne({ guildId: guild.id, ownerId: memberId });
    if (!document || document.suspendedAt) return false;
    const role = guild.roles.cache.get(document.roleId);
    if (role) {
        for (const member of role.members.values()) await member.roles.remove(role).catch(() => null);
    }
    document.suspendedAt = new Date();
    document.deleteAt = new Date(Date.now() + SUSPEND_TIME);
    await document.save();
    return true;
}

async function restoreBoosterRole(guild, memberId) {
    const document = await BoosterRole.findOne({ guildId: guild.id, ownerId: memberId });
    if (!document?.suspendedAt) return false;
    const role = guild.roles.cache.get(document.roleId);
    if (!role) {
        await BoosterRole.deleteOne({ _id: document._id });
        return false;
    }
    await removeSharedMembers(guild, role, document);
    const member = await guild.members.fetch(document.ownerId).catch(() => null);
    if (member) await member.roles.add(role).catch(() => null);
    document.suspendedAt = null;
    document.deleteAt = null;
    await document.save();
    return true;
}

async function removeSharedMembers(guild, role, document) {
    const sharedUserIds = document.sharedUserIds || [];
    if (!sharedUserIds.length) return;
    for (const userId of sharedUserIds) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member?.id !== document.ownerId) await member.roles.remove(role).catch(() => null);
    }
    document.sharedUserIds = [];
    await document.save();
}

function startBoosterRoleScheduler(client) {
    if (client.boosterRoleScheduler) return;
    const check = async () => {
        const documents = await BoosterRole.find({ deleteAt: { $lte: new Date() } }).catch(() => []);
        for (const document of documents) {
            const guild = client.guilds.cache.get(document.guildId);
            const role = guild?.roles.cache.get(document.roleId);
            if (role) await role.delete('Booster 3 gün içinde geri gelmedi.').catch(() => null);
            await BoosterRole.deleteOne({ _id: document._id });
        }
    };
    check().catch((error) => console.error('[BOOSTER_ROLE_SCHEDULER]', error));
    client.boosterRoleScheduler = setInterval(() => check().catch((error) => console.error('[BOOSTER_ROLE_SCHEDULER]', error)), 60000);
}

function ephemeralPanel(sections, rows = []) {
    const container = new ContainerBuilder().setAccentColor(0xeb459e);
    sections.forEach((section) => container.addTextDisplayComponents(new TextDisplayBuilder().setContent(section)));
    rows.forEach((row) => container.addActionRowComponents(row));
    return { flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container], allowedMentions: { parse: [], users: [], roles: [] } };
}

function replyInteraction(interaction, payload) {
    if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
    return interaction.reply(payload);
}

module.exports = {
    handleBoosterRoleInteraction,
    isBooster,
    restoreBoosterRole,
    startBoosterRoleScheduler,
    suspendBoosterRole,
};
