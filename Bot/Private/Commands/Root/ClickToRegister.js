module.exports = {
    name: 'kayıtpanel',
    aliases: ['kayitpanel'],
    category: 'Root',

    execute: async (client, message) => {
        if (!global.system.ownerID.includes(message.author.id)) return;
        return message.reply({ content: 'Butonlu kayıt sistemi kapalıdır. Manuel kayıt için `.k` komutunu kullanın.' });
    }
};
