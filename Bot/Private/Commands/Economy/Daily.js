const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'günlük',
    aliases: ['daily', 'gunluk', 'günlükpara', 'dailycoin'],
    category: 'Fun',

    execute: async (client, message) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        const remaining = cooldown - (now - account.dailyTimestamp);
        if (remaining > 0) {
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const buffer = await CanvasUtil.economyCard('GUNLUK ODUL', 'Henüz ödül zamanın gelmedi.', `Tekrar alabilmek için ${hours} sa ${minutes} dk bekle.`);
            return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'daily.png' })] });
        }

        const reward = Math.floor(Math.random() * 501) + 500;
        const updated = await updateAccount(message.author.id, {
            cash: account.coin + reward,
            dailyTimestamp: now,
        });
        const buffer = await CanvasUtil.economyCard('GUNLUK ODUL', `${formatDinar(reward)} cüzdanına eklendi.`, `Yeni Bakiyen: ${formatDinar(updated.coin)}`);
        return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'daily.png' })] });
    },
};
