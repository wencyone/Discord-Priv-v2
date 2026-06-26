const { PermissionFlagsBits } = require('discord.js');
const { formatDinar, getAccount, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'dinar-admin',
    aliases: ['da', 'dinarekle', 'dinarçıkar', 'dinarcikar'],
    category: 'Fun',

    execute: async (client, message, args) => {
        if (!global.system.ownerID.includes(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yetkin yok.');
        }

        const subCommand = message.content.includes('ekle') ? 'ekle' : (message.content.includes('çıkar') || message.content.includes('cikar') ? 'çıkar' : args[0]);
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]) || message.guild.members.cache.get(args[0]);
        const amount = Number(args.find((arg) => !Number.isNaN(Number(arg)) && !arg.includes('<@')) || 0);
        if (!target || !amount || amount <= 0) return message.reply('Geçerli bir kullanıcı ve miktar belirtmelisin.');

        const account = await getAccount(target.id);
        const newBalance = subCommand === 'çıkar' ? Math.max(0, account.coin - amount) : account.coin + amount;
        await updateAccount(target.id, { cash: newBalance });

        return message.reply(`${target} kullanıcısının bakiyesi güncellendi: **${formatDinar(newBalance)}**`);
    },
};
