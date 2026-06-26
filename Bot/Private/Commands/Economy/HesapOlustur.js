const { EmbedBuilder } = require('discord.js');
const { formatDinar, generateCardNumber, getAccount, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'hesapolustur',
    aliases: ['banka-hesabı-aç', 'banka-hesabi-ac', 'account-create'],
    category: 'Fun',

    execute: async (client, message) => {
        const account = await getAccount(message.author.id);
        if (account.hasAccount) return message.reply('Zaten aktif bir banka hesabın bulunuyor.');

        const startBalance = 500;
        const cardNumber = generateCardNumber();
        await updateAccount(message.author.id, {
            hasAccount: true,
            cardNumber,
            cash: account.coin + startBalance,
        });

        const embed = new EmbedBuilder()
            .setColor('#101010')
            .setTitle('Hesap Başarıyla Oluşturuldu')
            .setDescription([
                'Dinar dünyasına hoş geldin. Senin için bir banka hesabı ve özel kart tanımladım.',
                '',
                `Kart Numaran: \`${cardNumber}\``,
                `Başlangıç Bakiyesi: \`${formatDinar(startBalance)}\``,
            ].join('\n'))
            .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 512 }))
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() || undefined })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
