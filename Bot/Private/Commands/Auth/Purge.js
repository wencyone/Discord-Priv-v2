const { PermissionsBitField: { Flags }, bold } = require('discord.js');

module.exports = {
    name: 'sil',
    aliases: ['temizle'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency.auth.some(x => message.member.roles.cache.has(x)))
            return message.reply({ content: 'Yetkin yok.' });

        const target = message.mentions.users.first();

        let amount = target ? args[1] : args[0];

        if (!amount || isNaN(amount))
            return message.reply({ content: 'Bir sayı belirtmelisin.' })
                .then(s => setTimeout(() => s.delete().catch(() => {}), 5000));

        amount = Number(amount);

        if (amount < 1 || amount > 100)
            return message.reply({ content: '1 ile 100 arasında bir sayı belirtmelisin.' })
                .then(s => setTimeout(() => s.delete().catch(() => {}), 5000));

        try {
            if (target) {
                const messages = await message.channel.messages.fetch({ limit: 100 });

                const userMessages = messages
                    .filter(msg => msg.author.id === target.id)
                    .first(amount);

                if (!userMessages.length)
                    return message.reply({ content: `${target} kullanıcısına ait silinecek mesaj bulunamadı.` })
                        .then(s => setTimeout(() => s.delete().catch(() => {}), 5000));

                await message.channel.bulkDelete(userMessages, true);

                message.channel.send({
                    content: `${target} kullanıcısına ait ${bold(userMessages.length)} adet mesaj silindi.`
                }).then(s => setTimeout(() => s.delete().catch(() => {}), 15000));
            } else {
                await message.channel.bulkDelete(amount, true);

                message.channel.send({
                    content: `Başarıyla ${bold(amount)} adet mesaj silindi.`
                }).then(s => setTimeout(() => s.delete().catch(() => {}), 15000));
            }
        } catch (err) {
            console.error(err);
            message.reply({ content: 'Mesajlar silinirken bir hata oluştu.' })
                .then(s => setTimeout(() => s.delete().catch(() => {}), 5000));
        }
    }
};