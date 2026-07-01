const { PermissionsBitField: { Flags } } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');
const { releaseJail } = require('../../../Base/Jail');

module.exports = {
    name: 'unjail',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some((roleId) => message.member.roles.cache.has(roleId))) {
            return message.reply({ content: 'Yetkin yok.' });
        }

        const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!member) return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });

        const punishment = await Punishment.findOne({ guildId: message.guild.id, userId: member.id, type: 'jail', active: true }).sort({ caseId: -1 });
        if (!punishment) return message.reply({ content: 'Bu kullanıcı jailde değil.' });

        try {
            await releaseJail(client, punishment, false, message.author.id);
            return message.reply({ content: `${member} kullanıcısının jaili kaldırıldı. (Ceza Numarası: #${punishment.caseId})` });
        } catch (error) {
            console.error('[UNJAIL_COMMAND]', error);
            return message.reply({ content: 'Jail kaldırılırken bir hata oluştu.' });
        }
    }
};
