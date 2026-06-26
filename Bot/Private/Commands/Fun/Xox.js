const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'xox',
    aliases: ['tic-tac-toe'],
    category: 'Fun',

    execute: async (client, message) => {
        const opponent = message.mentions.users.first();
        if (!opponent || opponent.bot || opponent.id === message.author.id) {
            return message.reply('Oynamak için bir arkadaşını etiketlemelisin.');
        }

        const board = Array(9).fill(null);
        let turn = message.author.id;
        const createRows = () => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`xox_${index}`)
                            .setLabel(board[index] || '-')
                            .setStyle(board[index] === 'X' ? ButtonStyle.Primary : board[index] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary)
                            .setDisabled(Boolean(board[index])),
                    );
                }
                rows.push(row);
            }
            return rows;
        };

        const msg = await message.channel.send({
            content: `**XOX Oyunu**\nSıra: <@${turn}>`,
            components: createRows(),
        });
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async (i) => {
            if (![message.author.id, opponent.id].includes(i.user.id)) return i.reply({ content: 'Bu oyunda değilsin.', flags: 64 }).catch(() => null);
            if (i.user.id !== turn) return i.reply({ content: 'Sıra sende değil.', flags: 64 }).catch(() => null);

            const index = Number(i.customId.split('_')[1]);
            board[index] = turn === message.author.id ? 'X' : 'O';
            const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
            const winner = wins.find((line) => board[line[0]] && board[line[0]] === board[line[1]] && board[line[0]] === board[line[2]]);

            if (winner) {
                await i.update({ content: `**OYUN BİTTİ!** Kazanan: <@${turn}>`, components: createRows() });
                return collector.stop('finished');
            }
            if (board.every(Boolean)) {
                await i.update({ content: '**BERABERE!**', components: createRows() });
                return collector.stop('finished');
            }
            turn = turn === message.author.id ? opponent.id : message.author.id;
            return i.update({ content: `**XOX Oyunu**\nSıra: <@${turn}>`, components: createRows() }).catch(() => null);
        });
        collector.on('end', (_, reason) => {
            if (reason === 'time') msg.edit({ content: 'Oyun zaman aşımına uğradı.', components: [] }).catch(() => {});
        });
    },
};
