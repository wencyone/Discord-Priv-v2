const Settings = require('../../../Schema/Settings');

function getPrimaryGuildData(user) {
    const primaryGuild = user?.primaryGuild || user?.primary_guild;
    if (!primaryGuild) return null;

    return {
        guildId: primaryGuild.identityGuildId || primaryGuild.identity_guild_id || primaryGuild.guildId || primaryGuild.guild_id || primaryGuild.id,
        tag: primaryGuild.tag,
        identityEnabled: primaryGuild.identityEnabled ?? primaryGuild.identity_enabled
    };
}

module.exports = {
    name: 'yasaklitag',
    aliases: ['gtag', 'yasaklıtag', 'ytag'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!global.system.ownerID.includes(message.author.id)) return;

        const action = (args[0] || '').toLowerCase();
        const guildId = ['ekle', 'add', 'sil', 'kaldır', 'kaldir', 'remove'].includes(action) ? args[1] : args[0];

        if (['liste', 'list'].includes(action)) {
            const list = Array.isArray(wency.bannedGuildTags) ? wency.bannedGuildTags : [];
            if (!list.length) return message.reply({ content: 'Yasaklı guild tag listesi boş.' });

            return message.reply({
                content: list.map((entry, index) => `${index + 1}. ${entry.name || 'Bilinmeyen Sunucu'} - ${entry.guildId}${entry.tag ? ` [${entry.tag}]` : ''}`).join('\n')
            });
        }

        if (['sil', 'kaldır', 'kaldir', 'remove'].includes(action)) {
            if (!guildId) return message.reply({ content: 'Silmek için sunucu ID belirtmelisin. Örnek: .yasaklitag sil 123' });

            await Settings.updateOne(
                { id: message.guild.id },
                { $pull: { bannedGuildTags: { guildId } } },
                { upsert: true }
            );

            return message.reply({ content: `${guildId} yasaklı guild tag listesinden kaldırıldı.` });
        }

        if (!guildId || !/^\d{17,22}$/.test(guildId)) {
            return message.reply({
                content: 'Sunucu ID belirtmelisin. Örnek: .yasaklitag 123456789012345678 veya .yasaklitag ekle 123456789012345678'
            });
        }

        const list = Array.isArray(wency.bannedGuildTags) ? wency.bannedGuildTags : [];
        if (list.some((entry) => entry.guildId === guildId)) {
            return message.reply({ content: 'Bu sunucu zaten yasaklı guild tag listesinde.' });
        }

        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        const commandUser = await client.users.fetch(message.author.id, { force: true }).catch(() => message.author);
        const primaryGuild = getPrimaryGuildData(commandUser);
        const tag = primaryGuild?.guildId === guildId && primaryGuild?.identityEnabled !== false ? primaryGuild.tag : null;

        const data = {
            guildId,
            name: guild?.name || '',
            tag: tag || '',
            addedBy: message.author.id,
            addedAt: Date.now()
        };

        await Settings.updateOne(
            { id: message.guild.id },
            { $push: { bannedGuildTags: data } },
            { upsert: true }
        );

        return message.reply({
            content: `${data.name || guildId} yasaklı guild tag listesine eklendi. Bu sunucunun tagini aktif kullananlar kayıt edilemez.`
        });
    }
};
