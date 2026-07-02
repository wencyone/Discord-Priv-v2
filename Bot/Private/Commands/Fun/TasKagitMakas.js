const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');

module.exports = {
    name: 'taskagıtmakas',
    aliases: ['tkm', 'taş-kağıt-makas', 'tas-kagit-makas', 'taşkağıtmakas', 'taskagitmakas'],
    category: 'Fun',

    execute: async (client, message) => {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tkm_tas').setLabel('Taş').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tkm_kagit').setLabel('Kağıt').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tkm_makas').setLabel('Makas').setStyle(ButtonStyle.Secondary),
        );
        const msg = await message.reply({
            files: [new AttachmentBuilder(await CanvasUtil.rpsStartCard(message.author), { name: 'rps_start.png' })],
            components: [row],
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000,
            filter: (i) => i.user.id === message.author.id,
        });

        collector.on('collect', async (i) => {
            const choices = ['tkm_tas', 'tkm_kagit', 'tkm_makas'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const userChoice = i.customId;
            let result = 'Berabere!';
            if (
                (userChoice === 'tkm_tas' && botChoice === 'tkm_makas') ||
                (userChoice === 'tkm_kagit' && botChoice === 'tkm_tas') ||
                (userChoice === 'tkm_makas' && botChoice === 'tkm_kagit')
            ) result = 'Sen kazandın!';
            else if (userChoice !== botChoice) result = 'Bot kazandı!';

            await i.update({
                content: 'Oyun bitti.',
                files: [new AttachmentBuilder(await CanvasUtil.rpsCard(message.author, userChoice, botChoice, result), { name: 'rps_result.png' })],
                components: [],
            });
            collector.stop('finished');
        });
    },
};
