const { AttachmentBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'slot',
    aliases: ['s', 'slotlar'],
    category: 'Fun',

    execute: async (client, message, args) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        const amount = Number(args[0]);
        if (!amount || amount < 100) return message.reply('En az 100 Dinar miktar belirtmelisin.');
        if (account.coin < amount) return message.reply('Cüzdanında bu kadar Dinar bulunmuyor.');

        const slots = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
        const generateRandom = () => [0, 1, 2].map(() => slots[Math.floor(Math.random() * slots.length)]);

        const msg = await message.reply({
            content: 'Slotlar dönüyor...',
            files: [new AttachmentBuilder(await CanvasUtil.slotCard(generateRandom(), 'dönüyor', 0), { name: 'slot-spin.png' })],
        });

        for (let i = 0; i < 3; i++) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            await msg.edit({
                files: [new AttachmentBuilder(await CanvasUtil.slotCard(generateRandom(), 'dönüyor', 0), { name: 'slot-spin.png' })],
            }).catch(() => {});
        }

        const result = generateRandom();
        const isWin = result[0] === result[1] && result[1] === result[2];
        const finalReward = isWin ? (result[0] === '💎' ? amount * 10 : amount * 3) : 0;
        const updated = await updateAccount(message.author.id, {
            cash: isWin ? account.coin + finalReward : Math.max(0, account.coin - amount),
        });
        const buffer = await CanvasUtil.slotCard(result, isWin ? 'kazandı' : 'kaybetti', isWin ? finalReward : amount);

        return msg.edit({
            content: isWin
                ? `${message.author}, slotları patlattın. **+${formatDinar(finalReward)}** kazandın. Yeni bakiye: **${formatDinar(updated.coin)}**`
                : `${message.author}, kaybettin. **-${formatDinar(amount)}** Kalan bakiye: **${formatDinar(updated.coin)}**`,
            files: [new AttachmentBuilder(buffer, { name: 'slot-result.png' })],
        });
    },
};
