const { hasOwnerRole } = require('../../../Base/OwnerRole');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    ModalBuilder,
    PermissionFlagsBits,
    RoleSelectMenuBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    bold,
    inlineCode,
} = require('discord.js');
const Settings = require('../../../Schema/Settings');
const UserModel = require('../../../Schema/User');

module.exports = {
    name: 'ekip',
    aliases: ['team'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici olmalısın.');
        }

        const action = args[0]?.toLocaleLowerCase('tr-TR');
        if (action === 'liste' || action === 'list') return showTeamList(message);
        if (action === 'sil' || action === 'çıkar' || action === 'cikar') return showDeletePanel(message);
        if (action === 'oluştur' || action === 'olustur' || action === 'ekle') return showCreateLauncher(message);
        return showDashboard(message);
    },
};

async function getTeams(guildId, guild) {
    const settings = await Settings.findOne({ id: guildId }).lean();
    return (settings?.teams || []).filter((team) => guild.roles.cache.has(team.role));
}

async function showDashboard(message) {
    const teams = await getTeams(message.guild.id, message.guild);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('team:create').setLabel('Ekip Oluştur').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('team:delete').setLabel('Ekip Sil').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('team:list').setLabel('Ekip Liste').setStyle(ButtonStyle.Secondary),
    );
    const question = await message.channel.send(createPanel([
        `${message.author} ekip yönetim paneline hoş geldin.`,
        `› ${bold('Ekip Sistemi Özeti')}\n• Toplam Ekip: ${inlineCode(String(teams.length))}`,
    ], [row]));
    const interaction = await wait(question, message.author.id, ['team:create', 'team:delete', 'team:list']);
    if (!interaction) return expire(question);

    if (interaction.customId === 'team:create') return createTeam(message, interaction, question);
    await interaction.deferUpdate();
    if (interaction.customId === 'team:delete') return showDeletePanel(message, question);
    return showTeamList(message, question);
}

async function showCreateLauncher(message) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('team:create').setLabel('Ekip Oluştur').setStyle(ButtonStyle.Secondary)
    );
    const question = await message.channel.send(createPanel([
        '› **Ekip Oluştur**',
        'Ekip bilgilerini girmek için aşağıdaki butona tıkla.',
    ], [row]));
    const interaction = await wait(question, message.author.id, ['team:create']);
    if (!interaction) return expire(question);
    return createTeam(message, interaction, question);
}

async function createTeam(message, interaction, question) {
    const teams = await getTeams(message.guild.id, message.guild);
    if (teams.length >= 25) {
        await interaction.deferUpdate();
        return question.edit(createPanel(['❌ **Ekip Limiti Doldu**', 'En fazla 25 ekip oluşturulabilir.']));
    }

    const modalId = `team:create:${interaction.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Yeni Ekip Oluştur')
        .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Ekip Adı').setMinLength(2).setMaxLength(50).setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('owners').setLabel('Ekip Sahipleri ID').setPlaceholder('123, 456').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tags').setLabel('Ekip Tagları').setPlaceholder('tag1, tag2').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        );
    await interaction.showModal(modal);
    const retryCollector = question.createMessageComponentCollector({
        filter: (item) => item.user.id === message.author.id && item.customId === 'team:create',
        max: 1,
        time: 300000,
    });
    const retryPromise = new Promise((resolve) => {
        retryCollector.once('collect', resolve);
        retryCollector.once('end', (_, reason) => {
            if (reason !== 'limit') resolve(null);
        });
    });
    const result = await Promise.race([
        interaction.awaitModalSubmit({
            filter: (item) => item.user.id === message.author.id && item.customId === modalId,
            time: 300000,
        }).then((submitted) => ({ submitted })).catch(() => ({ submitted: null })),
        retryPromise.then((retry) => ({ retry })),
    ]);
    if (result.retry) return createTeam(message, result.retry, question);

    retryCollector.stop('submitted');
    const submitted = result.submitted;
    if (!submitted) return expire(question);

    const name = submitted.fields.getTextInputValue('name').trim().toLocaleLowerCase('tr-TR');
    const owners = submitted.fields.getTextInputValue('owners').split(',').map((id) => id.trim()).filter((id) => message.guild.members.cache.has(id));
    const tags = submitted.fields.getTextInputValue('tags').split(',').map((tag) => tag.trim().toLocaleLowerCase('tr-TR')).filter(Boolean);
    if (teams.some((team) => team.name === name)) return submitted.reply({ content: 'Bu isimde bir ekip zaten var.', flags: 64 });
    if (!owners.length) return submitted.reply({ content: 'Geçerli ekip sahibi ID belirtmelisin.', flags: 64 });
    if (teams.some((team) => team.tags?.some((tag) => tags.includes(tag)))) return submitted.reply({ content: 'Bu taglardan biri başka ekipte kullanılıyor.', flags: 64 });

    await submitted.deferUpdate();
    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('team:create:role').setPlaceholder('Ekip rolünü seç').setMaxValues(1)
    );
    await question.edit(createPanel([
        '› **Ekip Rolü Seçimi**',
        `${bold(titleCase(name))} ekibinin rolünü seç.`,
    ], [roleRow]));
    const roleInteraction = await wait(question, message.author.id, ['team:create:role'], 180000);
    if (!roleInteraction) return expire(question);
    await roleInteraction.deferUpdate();
    const role = roleInteraction.values[0];
    if (teams.some((team) => team.role === role)) return question.edit(createPanel(['❌ **Rol Kullanılıyor**', 'Bu role bağlı bir ekip zaten var.']));

    await Settings.updateOne(
        { id: message.guild.id },
        { $set: { teams: [...teams, { name, owners, role, tags }] } },
        { upsert: true }
    );
    return question.edit(createPanel([
        '✅ **Ekip Oluşturuldu**',
        `• Ekip: ${bold(titleCase(name))}\n• Rol: <@&${role}>\n• Taglar: ${tags.map((tag) => inlineCode(tag)).join(', ')}`,
    ]));
}

async function showDeletePanel(message, existingMessage = null) {
    const teams = await getTeams(message.guild.id, message.guild);
    if (!teams.length) return sendPanel(message, existingMessage, ['❌ **Ekip Bulunamadı**', 'Sunucuda kayıtlı ekip yok.']);

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('team:delete:select')
            .setPlaceholder('Silinecek ekibi seç')
            .addOptions(teams.slice(0, 25).map((team) => ({ label: titleCase(team.name), value: team.name, description: 'Ekibi sistemden kaldır' })))
    );
    const question = existingMessage || await message.channel.send(createPanel(['› **Ekip Sil**', 'Sistemden kaldırmak istediğin ekibi seç.'], [row]));
    if (existingMessage) await question.edit(createPanel(['› **Ekip Sil**', 'Sistemden kaldırmak istediğin ekibi seç.'], [row]));
    const interaction = await wait(question, message.author.id, ['team:delete:select']);
    if (!interaction) return expire(question);
    await interaction.deferUpdate();
    const selected = teams.find((team) => team.name === interaction.values[0]);
    if (!selected) return question.edit(createPanel(['❌ **Ekip Bulunamadı**']));

    await Settings.updateOne({ id: message.guild.id }, { $set: { teams: teams.filter((team) => team.name !== selected.name) } });
    return question.edit(createPanel(['✅ **Ekip Silindi**', `${bold(titleCase(selected.name))} ekibi sistemden kaldırıldı.`]));
}

async function showTeamList(message, existingMessage = null) {
    const teams = await getTeams(message.guild.id, message.guild);
    if (!teams.length) return sendPanel(message, existingMessage, ['❌ **Ekip Bulunamadı**', 'Sunucuda kayıtlı ekip yok.']);

    await message.guild.members.fetch().catch(() => null);
    const memberIds = [...new Set(teams.flatMap((team) => message.guild.members.cache.filter((member) => member.roles.cache.has(team.role)).map((member) => member.id)))];
    const documents = await UserModel.find({ id: { $in: memberIds } }).lean();
    const voiceTotals = new Map(documents.map((document) => [document.id, sumDays(document.voices)]));
    const stats = teams.map((team) => buildTeamStats(message, team, voiceTotals)).sort((a, b) => b.voiceTotal - a.voiceTotal || b.memberCount - a.memberCount);

    let page = 1;
    const perPage = 5;
    const totalPages = Math.ceil(stats.length / perPage);
    const render = (disabled = false) => {
        const start = (page - 1) * perPage;
        const entries = stats.slice(start, start + perPage).map((team, index) => formatTeamEntry(team, start + index));
        const rows = totalPages > 1 ? [pageButtons(page, totalPages, disabled)] : [];
        return createPanel([
            `› ${bold('Ekip Sıralaması')}\n• Toplam ${inlineCode(String(stats.length))} ekip, toplam ses istatistiğine göre sıralanıyor.`,
            entries.join('\n\n'),
            `• Sayfa ${inlineCode(`${page}/${totalPages}`)}`,
        ], rows);
    };

    const question = existingMessage ? await existingMessage.edit(render()) : await message.channel.send(render());
    if (totalPages === 1) return question;
    const collector = question.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id && interaction.customId.startsWith('team:page:'),
        time: 120000,
    });
    collector.on('collect', async (interaction) => {
        const action = interaction.customId.split(':')[2];
        if (action === 'first') page = 1;
        if (action === 'previous') page = Math.max(1, page - 1);
        if (action === 'next') page = Math.min(totalPages, page + 1);
        if (action === 'last') page = totalPages;
        await interaction.update(render());
    });
    collector.on('end', () => question.edit(render(true)).catch(() => null));
    return question;
}

function buildTeamStats(message, team, voiceTotals) {
    const members = message.guild.members.cache.filter((member) => member.roles.cache.has(team.role));
    const tags = (team.tags || []).map((tag) => tag.toLocaleLowerCase('tr-TR'));
    return {
        name: titleCase(team.name),
        role: team.role,
        memberCount: members.size,
        taggedCount: members.filter((member) => tags.some((tag) => member.displayName.toLocaleLowerCase('tr-TR').includes(tag))).size,
        voiceCount: members.filter((member) => member.voice.channelId).size,
        streamCount: members.filter((member) => member.voice.streaming).size,
        cameraCount: members.filter((member) => member.voice.selfVideo).size,
        voiceTotal: members.reduce((total, member) => total + Number(voiceTotals.get(member.id) || 0), 0),
    };
}

function formatTeamEntry(team, index) {
    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : inlineCode(`${index + 1}.`);
    return [
        `${rank} ${bold(team.name)} • <@&${team.role}>`,
        `• Ekip Üyesi: ${inlineCode(String(team.memberCount))} • Guild Tagında: ${inlineCode(String(team.taggedCount))}`,
        `• Seste: ${inlineCode(String(team.voiceCount))} • Yayın Açan: ${inlineCode(String(team.streamCount))} • Kamera Açan: ${inlineCode(String(team.cameraCount))}`,
        `• Toplam Ses İstatistiği: ${inlineCode(formatDuration(team.voiceTotal))}`,
    ].join('\n');
}

function createPanel(sections, rows = []) {
    const container = new ContainerBuilder().setAccentColor(0x5865f2);
    sections.filter(Boolean).forEach((section, index, array) => {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(section));
        if (index < array.length - 1 || rows.length) container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    });
    rows.forEach((row) => container.addActionRowComponents(row));
    return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [], users: [], roles: [] } };
}

function pageButtons(page, total, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('team:page:first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || page === 1),
        new ButtonBuilder().setCustomId('team:page:previous').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || page === 1),
        new ButtonBuilder().setCustomId('team:page:count').setLabel(`${page}/${total}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('team:page:next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || page === total),
        new ButtonBuilder().setCustomId('team:page:last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(disabled || page === total),
    );
}

function wait(message, userId, customIds, time = 60000) {
    return message.awaitMessageComponent({ filter: (interaction) => interaction.user.id === userId && customIds.includes(interaction.customId), time }).catch(() => null);
}

function expire(message) {
    return message.edit(createPanel(['❌ **İşlem Süresi Doldu**', 'Panel kapatıldı. Komutu yeniden kullanabilirsin.'])).catch(() => null);
}

function sendPanel(message, panelMessage, sections) {
    const payload = createPanel(sections);
    return panelMessage ? panelMessage.edit(payload) : message.channel.send(payload);
}

function sumDays(days = {}) {
    return Object.values(days).reduce((total, day) => total + Number(day?.total || 0), 0);
}

function formatDuration(ms = 0) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toLocaleString('tr-TR')} saat ${minutes} dakika`;
}

function titleCase(text) {
    return String(text || '').split(' ').map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)).join(' ');
}
