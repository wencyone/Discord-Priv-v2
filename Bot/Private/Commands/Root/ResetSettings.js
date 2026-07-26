const { hasOwnerRole } = require('../../../Base/OwnerRole');
const Settings = require('../../../Schema/Settings');

module.exports = {
    name: 'ayarsıfırla',
    aliases: ['ayarsifirla', 'settingsreset', 'ayarsifirla'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        await Settings.deleteOne({ id: message.guild.id });
        await Settings.create({ id: message.guild.id });

        return message.reply({
            content: 'Sunucu ayarları başarıyla sıfırlandı. Rolleri, kanalları ve sistemleri tekrar .setup üzerinden ayarlayabilirsin.'
        });
    }
};
