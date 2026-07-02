const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'coinflip',
    aliases: ['cf', 'yazıtura', 'yazitura'],
    category: 'Fun',

    execute: async (client, message, args) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        const amount = Number(args[0]);
        if (!amount || amount < 100) return message.reply('En az 100 Dinar miktar belirtmelisin.');
        if (account.coin < amount) return message.reply('Cüzdanında bu kadar Dinar bulunmuyor.');

        const result = Math.random() > 0.5 ? 'yazı' : 'tura';
        const isWin = Math.random() > 0.5;
        const updated = await updateAccount(message.author.id, {
            cash: isWin ? account.coin + amount : Math.max(0, account.coin - amount),
        });
        const buffer = await CanvasUtil.coinFlipCard(result, isWin ? 'kazandı' : 'kaybetti', amount);

        return message.reply({
            content: isWin
                ? `${message.author}, para **${result.toUpperCase()}** geldi. **+${formatDinar(amount)}** kazandın. Yeni bakiye: **${formatDinar(updated.coin)}**`
                : `${message.author}, para **${result.toUpperCase()}** geldi. **-${formatDinar(amount)}** kaybettin. Kalan bakiye: **${formatDinar(updated.coin)}**`,
            files: [new AttachmentBuilder(buffer, { name: 'cf-result.png' })],
        });
    },
};
