const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getEconomyBackground, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'dilen',
    aliases: ['beg'],
    category: 'Fun',

    execute: async (client, message) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        const now = Date.now();
        const cooldown = 30 * 60 * 1000;
        const remaining = cooldown - (now - account.lastBegTime);
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const buffer = await CanvasUtil.begCard('cooldown', 'Sokakta kimse yok.', `${minutes} dk ${seconds} sn sonra tekrar dene.`, getEconomyBackground(message.guild));
            return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'beg.png' })] });
        }

        if (Math.random() > 0.3) {
            const reward = Math.floor(Math.random() * 251) + 50;
            await updateAccount(message.author.id, {
                cash: account.coin + reward,
                lastBegTime: now,
            });
            const buffer = await CanvasUtil.begCard('success', `Bir hayırsever sana ${formatDinar(reward)} verdi.`, 'Bugünlük sansın iyi gitti.', getEconomyBackground(message.guild));
            return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'beg.png' })] });
        }

        await updateAccount(message.author.id, { lastBegTime: now });
        const buffer = await CanvasUtil.begCard('fail', 'Kimse sana para vermedi.', 'Herkes ters ters bakıp geçti.', getEconomyBackground(message.guild));
        return message.reply({ files: [new AttachmentBuilder(buffer, { name: 'beg.png' })] });
    },
};
