const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');

module.exports = {
    name: 'tweet',
    aliases: ['yaz', 'tivit', 'tw'],
    category: 'Fun',

    execute: async (client, message, args) => {
        const text = args.join(' ');
        if (!text) return message.reply('Tweet içeriğini yazmalısın.');
        if (text.length > 280) return message.reply('Tweet metni en fazla 280 karakter olabilir.');

        const likes = new Set();
        const dislikes = new Set();
        const createRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tweet_like').setLabel(`Beğen (${likes.size})`).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tweet_dislike').setLabel(`Beğenmeme (${dislikes.size})`).setStyle(ButtonStyle.Secondary),
        );

        const buffer = await CanvasUtil.tweetCard(message.author, text);
        const tweetMsg = await message.reply({
            files: [new AttachmentBuilder(buffer, { name: 'tweet.png' })],
            components: [createRow()],
        });

        const collector = tweetMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });
        collector.on('collect', async (i) => {
            if (i.customId === 'tweet_like') {
                likes.has(i.user.id) ? likes.delete(i.user.id) : likes.add(i.user.id);
                dislikes.delete(i.user.id);
            }
            if (i.customId === 'tweet_dislike') {
                dislikes.has(i.user.id) ? dislikes.delete(i.user.id) : dislikes.add(i.user.id);
                likes.delete(i.user.id);
            }
            await i.update({ components: [createRow()] });
        });
        collector.on('end', () => tweetMsg.edit({ components: [] }).catch(() => {}));
    },
};
