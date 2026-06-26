const { PermissionFlagsBits } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const {
    buildLeaderboardPayload,
    startLeaderboardInterval,
    updateLeaderboard
} = require('../../../Base/LeaderboardUtil');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'topliste'],
    category: 'Root',

    execute: async (client, message) => {
        if (
            !global.system.ownerID.includes(message.author.id) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('Bu komutu sadece yöneticiler kullanabilir.');
        }

        const intervalMinutes = 30;
        const interval = intervalMinutes * 60 * 1000;

        const setupMsg = await message.channel.send({
            content: 'Leaderboard paneli hazırlanıyor...'
        });

        try {
            const payload = await buildLeaderboardPayload(client, message.guild);

            const panelMsg = await message.channel.send(payload);

            const panel = {
                channelId: message.channel.id,
                messageId: panelMsg.id,
                interval
            };

            await Settings.updateOne(
                { id: message.guild.id },
                {
                    $set: {
                        leaderboardPanel: panel
                    }
                },
                { upsert: true }
            );

            await updateLeaderboard(client, message.guild.id, panel);

            startLeaderboardInterval(client, message.guild.id, panel);

            await setupMsg.edit({
                content: `Leaderboard paneli kuruldu. Her **${intervalMinutes} dakikada bir** otomatik güncellenecek.`
            });
        } catch (err) {
            console.error('[LEADERBOARD_SETUP_ERROR]', err);

            await setupMsg.edit({
                content: 'Leaderboard paneli kurulurken bir hata oluştu.'
            }).catch(() => {});
        }
    },
};