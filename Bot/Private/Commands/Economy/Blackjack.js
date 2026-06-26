const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');
const { formatDinar, getAccount, getPrefix, updateAccount } = require('../../../Base/FunUtils');

module.exports = {
    name: 'blackjack',
    aliases: ['bj'],
    category: 'Fun',

    execute: async (client, message, args) => {
        const account = await getAccount(message.author.id);
        if (!account.hasAccount) return message.reply(`Önce banka hesabı oluşturmalısın: \`${getPrefix()}hesapolustur\``);

        let bet = Number(args[0]);
        if (!bet || bet < 100) return message.reply('En az 100 Dinar miktar belirtmelisin.');
        if (account.coin < bet) return message.reply('Cüzdanında bu kadar Dinar bulunmuyor.');

        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const createDeck = () => values.flatMap((value) => ['hearts', 'diamonds', 'clubs', 'spades'].map((suit) => ({ suit, value }))).sort(() => Math.random() - 0.5);
        const getScore = (hand) => {
            let score = 0;
            let aces = 0;
            for (const card of hand) {
                if (card.hidden) continue;
                if (card.value === 'A') {
                    score += 11;
                    aces++;
                } else if (['J', 'Q', 'K'].includes(card.value)) score += 10;
                else score += Number(card.value);
            }
            while (score > 21 && aces > 0) {
                score -= 10;
                aces--;
            }
            return score;
        };

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), { ...deck.pop(), hidden: true }];
        let status = 'devam';
        let gameOver = false;

        const controls = () => {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bj_hit').setLabel('Kart Çek').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('bj_stand').setLabel('Dur').setStyle(ButtonStyle.Secondary),
            );
            if (account.coin >= bet * 2) row.addComponents(new ButtonBuilder().setCustomId('bj_double').setLabel('İkiye Katla').setStyle(ButtonStyle.Success));
            return [row];
        };
        const render = async () => new AttachmentBuilder(await CanvasUtil.blackjackCard(dealerHand, playerHand, dealerHand[1].hidden ? getScore([dealerHand[0]]) : getScore(dealerHand), getScore(playerHand), status, bet), { name: 'blackjack.png' });
        const finish = async () => {
            dealerHand[1].hidden = false;
            gameOver = true;
            while (getScore(dealerHand) < 17) dealerHand.push(deck.pop());
            const playerScore = getScore(playerHand);
            const dealerScore = getScore(dealerHand);
            if (playerScore > 21) status = 'kaybettin';
            else if (dealerScore > 21 || playerScore > dealerScore) status = 'kazandın';
            else if (playerScore < dealerScore) status = 'kaybettin';
            else status = 'berabere';
        };

        if (getScore(playerHand) === 21) {
            status = 'blackjack';
            dealerHand[1].hidden = false;
            gameOver = true;
        }

        const msg = await message.reply({ files: [await render()], components: gameOver ? [] : controls() });
        if (gameOver) {
            const gain = Math.floor(bet * 1.5);
            const updated = await updateAccount(message.author.id, { cash: account.coin + gain });
            await message.channel.send(`${message.author}, blackjack. **+${formatDinar(gain)}** Yeni bakiye: **${formatDinar(updated.coin)}**`);
            return;
        }

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Bu oyun senin değil.', flags: 64 }).catch(() => null);

            if (i.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                if (getScore(playerHand) > 21) await finish();
            } else if (i.customId === 'bj_double') {
                bet *= 2;
                playerHand.push(deck.pop());
                await finish();
            } else if (i.customId === 'bj_stand') {
                await finish();
            }

            await i.update({ files: [await render()], components: gameOver ? [] : controls() });
            if (!gameOver) return;

            const delta = status === 'kazandın' ? bet : status === 'kaybettin' ? -bet : 0;
            const updated = await updateAccount(message.author.id, { cash: Math.max(0, account.coin + delta) });
            await message.channel.send(`${message.author}, sonuç: **${status}**. ${delta >= 0 ? '+' : '-'}${formatDinar(Math.abs(delta))} Bakiye: **${formatDinar(updated.coin)}**`);
            collector.stop('finished');
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) msg.edit({ content: 'Oyun zaman aşımına uğradı.', components: [] }).catch(() => {});
        });
    },
};
