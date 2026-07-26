const { PermissionsBitField: { Flags } } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');
const ForceBan = require('../../../Schema/ForceBan');

module.exports = {
    name: 'unban',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        try {
            if (!message.member.permissions.has(Flags.Administrator) && !wency.banAuth.some((x) => message.member.roles.cache.has(x))) {
                return message.reply({ content: 'Yetkin yok.' });
            }

            const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
            if (!targetId) return message.reply({ content: 'Bir kullanıcı ID belirtmelisin.' });
            if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı ID belirtmelisin.' });

            const bans = await message.guild.bans.fetch().catch(() => null);
            if (!bans || bans.size === 0) {
                return message.reply({ content: 'Bu sunucuda banlanmış bir kullanıcı yok.' });
            }

            const bannedMember = bans.get(targetId) || bans.find((x) => x.user?.id === targetId);
            if (!bannedMember) {
                return message.reply({ content: 'Bu kullanıcı banlanmamış.' });
            }

            const forceBan = await ForceBan.exists({ guildId: message.guild.id, userId: targetId, active: true });
            if (forceBan) {
                return message.reply({ content: 'Bu kullanıcı forcebanlı. Banı sadece `.unforceban` ile kaldırılabilir.' });
            }

            await message.guild.members.unban(targetId).catch(async (err) => {
                if (err?.code === 50013) {
                    await message.reply({ content: 'Missing Permissions: Ban kaldırma iznim yok veya rol hiyerarşisi yetersiz.' }).catch(() => null);
                    return;
                }
                throw err;
            });
            await Punishment.updateMany({ guildId: message.guild.id, userId: targetId, type: 'ban', active: true }, { $set: { active: false } }).catch(() => null);

            return message.reply({ content: `${bannedMember.user || targetId} kullanıcısının banı kaldırıldı.` });
        } catch (error) {
            console.error('[UNBAN_COMMAND]', error);
            return message.reply({ content: 'Unban işlemi sırasında bir hata oluştu.' }).catch(() => null);
        }
    }
};
