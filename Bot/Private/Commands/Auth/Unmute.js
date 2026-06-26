const { PermissionsBitField: { Flags } } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');

module.exports = {
    name: 'unmute',
    aliases: ['untimeout', 'untime'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        try {
            if (!message.member.permissions.has(Flags.Administrator) && !wency.timeOutAuth.some((x) => message.member.roles.cache.has(x))) {
                return message.reply({ content: 'Yetkin yok.' });
            }

            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!member) return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });

            const hasTimeout =
                typeof member.isCommunicationDisabled === 'function'
                    ? member.isCommunicationDisabled()
                    : Boolean(member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now());

            if (!hasTimeout) return message.reply({ content: 'Bu kullanıcı timeoutlu değil.' });

            await member.timeout(null).catch(async (err) => {
                if (err?.code === 50013) {
                    await message.reply({ content: 'Missing Permissions: Timeout kaldırma iznim yok veya rol hiyerarşisi yetersiz.' }).catch(() => null);
                    return;
                }
                throw err;
            });
            await Punishment.updateMany({ guildId: message.guild.id, userId: member.id, type: 'timeout', active: true }, { $set: { active: false } }).catch(() => null);

            return message.reply({ content: `${member} kullanıcısının timeout’u kaldırıldı.` });
        } catch (error) {
            console.error('[UNMUTE_COMMAND]', error);
            return message.reply({ content: 'Unmute işlemi sırasında bir hata oluştu.' }).catch(() => null);
        }
    }
};
