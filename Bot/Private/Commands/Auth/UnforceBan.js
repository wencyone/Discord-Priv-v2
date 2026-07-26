const ForceBan = require('../../../Schema/ForceBan');
const Punishment = require('../../../Schema/Punishment');
const { sendAffLog } = require('../../../Base/AffLog');
const { hasOwnerRole } = require('../../../Base/OwnerRole');

module.exports = {
    name: 'unforceban',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) {
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Owner Rolüne sahip olmalısın.' });
        }

        const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
        if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı ID belirtmelisin.' });

        const record = await ForceBan.findOne({ guildId: message.guild.id, userId: targetId, active: true });
        if (!record) return message.reply({ content: 'Bu kullanıcı aktif forceban listesinde değil.' });

        const user = await client.users.fetch(targetId).catch(() => null);
        record.active = false;
        record.unforceBy = message.author.id;
        record.unforceAt = new Date();
        await record.save();

        await message.guild.members.unban(targetId, `UnforceBan | Yetkili: ${message.author.tag} (${message.author.id})`).catch((error) => {
            if (error?.code !== 10026) throw error;
        });
        await Punishment.updateMany(
            { guildId: message.guild.id, userId: targetId, type: 'ban', active: true, source: 'forceban' },
            { $set: { active: false } }
        ).catch(() => null);

        await sendAffLog(message.guild, 'ForceBan Kaldırıldı', [
            { name: 'Kullanıcı', value: `${user || targetId} (\`${targetId}\`)` },
            { name: 'Yetkili', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
        ], 0x57f287);

        return message.reply({ content: `${user || targetId} kullanıcısının forcebanı kaldırıldı.` });
    }
};
