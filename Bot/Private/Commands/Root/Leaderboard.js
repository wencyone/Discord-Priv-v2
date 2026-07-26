const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { PermissionFlagsBits } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const {
    buildLeaderboardPayloads,
    LEADERBOARD_INTERVAL,
    LEADERBOARD_TYPES,
    startLeaderboardInterval,
} = require('../../../Base/LeaderboardUtil');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'topliste'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (
            !hasOwnerRole(message.member, wency) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('Bu komutu sadece yöneticiler kullanabilir.');
        }

        const setupMessage = await message.channel.send({ content: 'Leaderboard panelleri hazırlanıyor...' });

        try {
            const settings = await Settings.findOne({ id: message.guild.id }).lean();
            const oldPanel = settings?.leaderboardPanel || {};
            const payloads = await buildLeaderboardPayloads(client, message.guild);
            const messageIds = {};

            for (const type of LEADERBOARD_TYPES) {
                const oldMessageId = oldPanel.channelId === message.channel.id
                    ? oldPanel.messageIds?.[type] || (type === 'messages' ? oldPanel.messageId : null)
                    : null;
                const oldMessage = oldMessageId
                    ? await message.channel.messages.fetch(oldMessageId).catch(() => null)
                    : null;
                const panelMessage = oldMessage
                    ? await oldMessage.edit(payloads[type])
                    : await message.channel.send(payloads[type]);
                messageIds[type] = panelMessage.id;
            }

            const panel = {
                channelId: message.channel.id,
                messageIds,
                interval: LEADERBOARD_INTERVAL,
            };

            await Settings.updateOne(
                { id: message.guild.id },
                { $set: { leaderboardPanel: panel } },
                { upsert: true }
            );

            startLeaderboardInterval(client, message.guild.id, panel);
            await setupMessage.edit({
                content: 'Dört leaderboard paneli kuruldu. Paneller her **3 saatte bir** otomatik güncellenecek.'
            });
        } catch (error) {
            console.error('[LEADERBOARD_SETUP_ERROR]', error);
            await setupMessage.edit({ content: 'Leaderboard panelleri kurulurken bir hata oluştu.' }).catch(() => null);
        }
    },
};
