const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getEconomyBackground, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'transfer',
    aliases: ['pay'],
    category: 'Fun',

    execute: async (client, message, args) => {
        const sender = await getAccount(message.author.id);
        if (!sender.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const amount = Number(args.find((arg) => !Number.isNaN(Number(arg)) && !arg.includes('<@')) || 0);
        if (!target || target.id === message.author.id || target.user.bot) return message.reply('Geçerli bir kullanıcı etiketlemelisin.');
        if (!amount || amount < 100) return message.reply('En az 100 Dinar miktar belirtmelisin.');
        if (sender.coin < amount) return message.reply('Yetersiz bakiye.');

        const receiver = await getAccount(target.id);
        if (!receiver.hasAccount) return message.reply('Alıcının banka hesabı bulunmuyor.');

        await updateAccount(message.author.id, { cash: sender.coin - amount });
        await updateAccount(target.id, { cash: receiver.coin + amount });

        const buffer = await CanvasUtil.economyCard('TRANSFER BASARILI', `${formatDinar(amount)} transfer edildi.`, `Alıcı: ${target.user.username}`, getEconomyBackground(message.guild));
        return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'transfer.png' })] });
    },
};
