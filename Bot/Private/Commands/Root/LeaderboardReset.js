const UserModel = require('../../../Schema/User');
const JoinModel = require('../../../Schema/Join');
const Settings = require('../../../Schema/Settings');
const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { updateLeaderboard } = require('../../../Base/LeaderboardUtil');

module.exports = {
    name: 'leaderboardsifirla',
    aliases: ['tzero', 'topsifirla', 'topsıfırla', 'statsifirla', 'lbsifirla'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) {
            return message.reply({ content: 'Bu komutu kullanma yetkiniz bulunmuyor.' })
                .then((reply) => setTimeout(() => reply.delete().catch(() => {}), 5000));
        }

        const resetTime = new Date();
        resetTime.setHours(0, 0, 0, 0);

        try {
            await UserModel.updateMany({}, {
                $set: {
                    day: 1,
                    lastDayTime: resetTime.getTime(),
                    voices: {},
                    messages: {},
                    streams: {},
                    cameras: {}
                }
            });

           
            await JoinModel.deleteMany({});
            const now = Date.now();
            const activeVoiceMembers = message.guild.members.cache.filter((member) => member.voice?.channelId);

            if (activeVoiceMembers.size) {
                await JoinModel.insertMany(activeVoiceMembers.map((member) => {
                    const session = { id: member.id, voice: now };
                    if (member.voice.streaming) session.stream = now;
                    if (member.voice.selfVideo) session.camera = now;
                    return session;
                }));
            }

            const settings = await Settings.findOne({ id: message.guild.id }).lean();
            if (settings?.leaderboardPanel?.channelId) {
                await updateLeaderboard(client, message.guild.id, settings.leaderboardPanel).catch(() => false);
            }

            const reply = await message.reply({
                content: 'Leaderboard ve tüm top istatistikleri başarıyla sıfırlandı.'
            });
            setTimeout(() => reply.delete().catch(() => {}), 8000);
        } catch (error) {
            console.error('[LEADERBOARD_RESET_ERROR]', error);
            const reply = await message.reply({ content: 'Leaderboard verileri sıfırlanırken bir hata oluştu.' });
            setTimeout(() => reply.delete().catch(() => {}), 8000);
        }
    }
};
