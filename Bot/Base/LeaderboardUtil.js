const {
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
} = require('discord.js');
const UserModel = require('../Schema/User');

const INTERVALS = new Map();
const LEADERBOARD_INTERVAL = 3 * 60 * 60 * 1000;
const LEADERBOARD_TYPES = ['messages', 'voices', 'streams', 'cameras'];

const TYPE_DETAILS = {
    messages: { emoji: '💬', title: 'Mesaj Sıralaması' },
    voices: { emoji: '🎤', title: 'Ses Sıralaması' },
    streams: { emoji: '🖥️', title: 'Yayın Sıralaması' },
    cameras: { emoji: '📷', title: 'Kamera Sıralaması' },
};

function sumDays(days = {}) {
    return Object.values(days).reduce((total, day) => total + Number(day?.total || 0), 0);
}

function formatDuration(ms = 0) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toLocaleString('tr-TR')} saat, ${minutes} dakika, ${seconds} saniye`;
}

function formatValue(type, value) {
    if (type === 'messages') return `${Number(value).toLocaleString('tr-TR')} mesaj`;
    return formatDuration(value);
}

function rankLabel(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `\`${index + 1}.\``;
}

async function getLeaderboardData(guild) {
    await guild.members.fetch().catch(() => null);
    const documents = await UserModel.find({}).lean();
    const result = {};

    for (const type of LEADERBOARD_TYPES) {
        const rows = documents
            .map((document) => ({ id: document.id, total: sumDays(document[type]) }))
            .filter((row) => {
                const member = guild.members.cache.get(row.id);
                return row.total > 0 && member && !member.user.bot;
            })
            .sort((a, b) => b.total - a.total);

        result[type] = {
            total: rows.reduce((total, row) => total + row.total, 0),
            rows: rows.slice(0, 50),
        };
    }

    return result;
}

function buildCategoryPayload(type, data, updatedAt = Date.now()) {
    const detail = TYPE_DETAILS[type];
    const ranking = data.rows.length
        ? data.rows.map((row, index) => `${rankLabel(index)} <@${row.id}>: \`${formatValue(type, row.total)}\``).join('\n')
        : 'Bu kategori için henüz veri bulunmuyor.';

    const content = [
        '# ✨ Liderlik Tablosu',
        `## ${detail.emoji} ${detail.title}`,
        `**Toplam:** \`${formatValue(type, data.total)}\``,
        '',
        ranking,
        '',
        `**Güncellenme Tarihi:** <t:${Math.floor(updatedAt / 1000)}:R>`,
    ].join('\n');

    const container = new ContainerBuilder()
        .setAccentColor(0x9b59b6)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        attachments: [],
        allowedMentions: { parse: [], users: [], roles: [] },
    };
}

async function buildLeaderboardPayloads(client, guild) {
    const data = await getLeaderboardData(guild);
    const updatedAt = Date.now();

    return Object.fromEntries(
        LEADERBOARD_TYPES.map((type) => [type, buildCategoryPayload(type, data[type], updatedAt)])
    );
}

async function updateLeaderboard(client, guildId, panel) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild || !panel?.channelId || !panel?.messageIds) return false;

    const channel = guild.channels.cache.get(panel.channelId);
    if (!channel?.isTextBased()) return false;

    const payloads = await buildLeaderboardPayloads(client, guild);
    let updated = 0;

    for (const type of LEADERBOARD_TYPES) {
        const messageId = panel.messageIds[type];
        if (!messageId) continue;
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) continue;
        await message.edit(payloads[type]);
        updated++;
    }

    return updated === LEADERBOARD_TYPES.length;
}

function startLeaderboardInterval(client, guildId, panel) {
    if (!panel?.channelId || !panel?.messageIds) return;

    client.leaderboardIntervals ||= new Map();
    const key = `${guildId}:${panel.channelId}`;
    const old = client.leaderboardIntervals.get(key) || INTERVALS.get(key);
    if (old) clearInterval(old);

    const interval = setInterval(() => {
        updateLeaderboard(client, guildId, panel).catch((error) => console.error('[LEADERBOARD_INTERVAL]', error));
    }, LEADERBOARD_INTERVAL);

    client.leaderboardIntervals.set(key, interval);
    INTERVALS.set(key, interval);
}

module.exports = {
    buildLeaderboardPayloads,
    LEADERBOARD_INTERVAL,
    LEADERBOARD_TYPES,
    startLeaderboardInterval,
    updateLeaderboard,
};
