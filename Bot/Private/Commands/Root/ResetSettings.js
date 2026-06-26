const Settings = require('../../../Schema/Settings');

module.exports = {
    name: 'ayarsıfırla',
    aliases: ['ayarsifirla', 'settingsreset', 'ayarsifirla'],
    category: 'Root',

    execute: async (client, message) => {
        if (!global.system.ownerID.includes(message.author.id)) return;

        await Settings.deleteOne({ id: message.guild.id });
        await Settings.create({ id: message.guild.id });

        return message.reply({
            content: 'Sunucu ayarları başarıyla sıfırlandı. Rolleri, kanalları ve sistemleri tekrar .setup üzerinden ayarlayabilirsin.'
        });
    }
};
