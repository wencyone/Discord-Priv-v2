const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { getAccount, getEconomyBackground, getPrefix } = require('../../../Base/FunUtils');

module.exports = {
    name: 'hesapkart',
    aliases: ['banka-kartı', 'banka-karti', 'card', 'bank-card'],
    category: 'Fun',

    execute: async (client, message) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount || !account.cardNumber) {
            return message.reply(`Henüz banka hesabın yok. \`${getPrefix()}hesapolustur\` yazarak açabilirsin.`);
        }

        const loading = await message.reply('Banka kartı hazırlanıyor...');
        const buffer = await CanvasUtil.bankCard(message.author, account.cardNumber, account.coin, getEconomyBackground(message.guild));
        return loading.edit({
            content: null,
            files: [new AttachmentBuilder(buffer, { name: 'bank-card.png' })],
        });
    },
};
