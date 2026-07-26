const { hasOwnerRole } = require('../../../Base/OwnerRole');
module.exports = {
    name: 'kayıtpanel',
    aliases: ['kayitpanel'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;
        return message.reply({ content: 'Butonlu kayıt sistemi kapalıdır. Manuel kayıt için `.k` komutunu kullanın.' });
    }
};
