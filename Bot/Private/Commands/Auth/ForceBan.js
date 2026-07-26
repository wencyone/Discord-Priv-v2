const { EmbedBuilder } = require('discord.js');
const ForceBan = require('../../../Schema/ForceBan');
const Punishment = require('../../../Schema/Punishment');
const PunishmentCounter = require('../../../Schema/PunishmentCounter');
const { sendAffLog } = require('../../../Base/AffLog');
const { hasOwnerRole } = require('../../../Base/OwnerRole');

module.exports = {
    name: 'forceban',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) {
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Owner Rolüne sahip olmalısın.' });
        }

        const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
        if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı ID belirtmelisin.' });
        if (targetId === message.author.id) return message.reply({ content: 'Kendini forcebanlayamazsın.' });
        if (targetId === message.guild.ownerId) return message.reply({ content: 'Sunucu sahibini forcebanlayamazsın.' });

        const member = message.mentions.members.first() || await message.guild.members.fetch(targetId).catch(() => null);
        const user = member?.user || await client.users.fetch(targetId).catch(() => null);
        if (!user) return message.reply({ content: 'Kullanıcı bulunamadı.' });

        if (member && member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ content: 'Bu kullanıcıyı banlayamam, rolü botun rolünden yüksek.' });
        }

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        await message.guild.bans.create(user.id, { reason: `ForceBan | ${reason}` });

        await ForceBan.findOneAndUpdate(
            { guildId: message.guild.id, userId: user.id },
            {
                $set: {
                    moderatorId: message.author.id,
                    reason,
                    active: true,
                    unforceBy: '',
                    unforceAt: null,
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const counter = await PunishmentCounter.findOneAndUpdate(
            { guildId: message.guild.id },
            { $inc: { caseId: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        await Punishment.create({
            guildId: message.guild.id,
            caseId: counter.caseId,
            userId: user.id,
            moderatorId: message.author.id,
            type: 'ban',
            reason: `ForceBan | ${reason}`,
            source: 'forceban',
        });

        await sendAffLog(message.guild, 'ForceBan Eklendi', [
            { name: 'Kullanıcı', value: `${user} (\`${user.id}\`)` },
            { name: 'Yetkili', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
            { name: 'Sebep', value: reason, inline: true },
        ], 0xed4245);

        return message.reply({ content: `${user} forcebanlandı. Bu ban sadece \`.unforceban\` ile kaldırılabilir.` });
    }
};
