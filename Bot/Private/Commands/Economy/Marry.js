const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserModel = require('../../../Schema/User')

module.exports = {
    name: 'evlen',
    aliases: ['marry'],
    category: 'Economy',

    execute: async (client, message, args, wency) => {
        const channel = message.guild.channels.cache.get(wency.coinChannel);
        if (message.channel.name !== channel?.name) return message.reply({ content: `Bu komut sadece ${channel} kanalında kullanılabilir.` });

        const document = (await UserModel.findOne({ id: message.author.id })) || new UserModel({ id: message.author.id }).save();

        if (document.marriage.active === true) {
            message.reply('Zaten biriyle evlisin.');
            return;
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            message.reply('Bir kullanıcı belirtmelisin.');
            return;
        }

        if (member.id === message.author.id) {
            message.reply('Kendinle evlenemezsin.');
            return;
        }

        const ring = Number(args[1])
        if (isNaN(ring)) {
            message.reply('Yüzük numarası belirtmelisin.');
            return;
        }

        if (ring < 1 || ring > 5) {
            message.reply('Yüzük numarası 1-5 arasında olmalıdır.');
            return;
        }

        if (document.inventory[`ring${ring}`] === 0) {
            message.reply('Bu yüzüğü bulunmuyor.');
            return;
        }

        const userDocument = (await UserModel.findOne({ id: member.id })) || new UserModel({ id: member.id }).save();

        if (userDocument.marriage.active === true) {
            message.reply('Bu kullanıcı zaten biriyle evli.');
            return;
        }

        if (global.system.ownerID.includes(message.author.id)) {
            document.inventory[`ring${ring}`] -= 1
            document.marriage.active = true
            document.marriage.married = member.id
            document.marriage.date = Date.now()
            document.marriage.ring = ring
            document.markModified('inventory')
            document.markModified('marriage')
            await document.save()

            userDocument.marriage.active = true
            userDocument.marriage.married = message.author.id
            userDocument.marriage.date = Date.now()
            userDocument.marriage.ring = ring
            userDocument.markModified('marriage')
            await userDocument.save()

            message.channel.send({ content: `🎀💞💗 Tebrikler! ${member} ile direkt evlendin. (BOT SAHİP)` })
            return;
        }

        const row = new ActionRowBuilder({
            components: [
                new ButtonBuilder({
                    customId: 'accept',
                    label: 'Evet',
                    style: ButtonStyle.Success,
                    emoji: '✅'

                }),

                new ButtonBuilder({
                    customId: 'deaccept',
                    label: 'Hayır',
                    style: ButtonStyle.Danger,
                    emoji: '❌'
                })
            ]
        })

        const embed = new EmbedBuilder({
            author: { name: `${message.author.username}, ${member.username} kullanıcısına ${ring == 1 ? 'Pırlanta' : ring == 2 ? 'Baget' : ring == 3 ? 'Tektaş' : ring == 4 ? 'Tria' : 'Beştaş'} Yüzükle evlenme teklifi etti!`, },
            thumbnail: { url: `${ring == 1 ? 'https://cdn.discordapp.com/emojis/590393334384558110' : ring == 2 ? 'https://cdn.discordapp.com/emojis/590393334036693004' : ring == 3 ? 'https://cdn.discordapp.com/emojis/590393334003138570' : ring == 4 ? 'https://cdn.discordapp.com/emojis/590393335819272203.gif' : 'https://cdn.discordapp.com/emojis/590393335915479040.gif'}` },
            description: `:tada: Vaov! Vaov! Vaov! ${member} görünüşe göre ${message.author} size ${ring == 1 ? '**Pırlanta**' : ring == 2 ? '**Baget**' : ring == 3 ? '**Tektaş**' : ring == 4 ? '**Tria**' : '**Beştaş**'} Yüzükle evlenme teklifi etti! Kabul etmek veya reddetmek için aşağıdaki butonlara basmanız gerekmektedir. Ne zaman ayrılmak isterseniz **.boşan** yazarak ayrılabilirsiniz. Şimdiden mutluluklar!`,
            timestamp: new Date()
        })

        const question = await message.channel.send({
            content: member.toString(),
            embeds: [embed],
            components: [row]
        })

        const filter = (i) => i.user.id === user.id
        const collector = question.createMessageComponentCollector({ filter, time: 60000 })

        collector.on('collect', async (i) => {
            i.deferUpdate();

            if (i.customId === 'accept') {
                document.inventory[`ring${ring}`] -= 1
                document.marriage.active = true
                document.marriage.married = member.id
                document.marriage.date = Date.now()
                document.marriage.ring = ring
                document.markModified('inventory')
                document.markModified('marriage')
                await document.save()

                userDocument.marriage.active = true
                userDocument.marriage.married = message.author.id
                userDocument.marriage.date = Date.now()
                userDocument.marriage.ring = ring
                userDocument.markModified('marriage')
                await userDocument.save()

                question.edit({ content: `🎀💞💗 Tebrikler! ${member} ile evlendiniz.` })
            } else if (i.customId === 'deaccept') {
                question.edit({ content: `Maalesef! ${member} evlenme teklifinizi reddetti.` })
            }
        });
    }
}