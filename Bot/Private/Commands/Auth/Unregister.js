const { PermissionsBitField: { Flags } } = require('discord.js');

module.exports = {
    name: 'unreg',
    aliases: ['unregister', 'kayıtsız', 'kayitsiz'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!wency.genderSystem || wency.autoRole) {
            return message.reply({ content: 'Manuel kayıt sistemi aktif değil.' });
        }

        if (!message.member.permissions.has(Flags.Administrator) && !wency.auth.some(x => message.member.roles.cache.has(x)))
            return message.reply({ content: 'Yetkin yok.' });

        const member = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        if (!member)
            return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });

        const user = message.guild.members.cache.get(member.id);
        if (!user)
            return message.reply({ content: 'Kullanıcı bulunamadı.' });
        if (user.id === message.author.id)
            return message.reply({ content: 'Kendini kayıtsıza atamazsın.' });
        if (message.member.roles.highest.id === user?.roles?.highest?.id)
            return message.reply({ content: 'Kendi rolündeki kişiyi kayıtsıza atamazsın.' });
        if (user?.roles?.highest?.rawPosition >= message.member?.roles?.highest?.rawPosition)
            return message.reply({ content: 'Yetkili olduğun kişiyi kayıtsıza atamazsın.' });
        if (message.guild?.members.me?.roles.highest.id === user?.roles?.highest?.id)
            return message.reply({ content: 'Botun rolündeki kişiyi kayıtsıza atamazsın..' });
        if (!wency.unregisteredRole)
            return message.reply({ content: 'Kayıtsız rolü ayarlanmamış.' });

        const rolesToRemove = user.roles.cache
            .filter((role) => role.id !== message.guild.id && role.id !== wency.unregisteredRole && !role.managed)
            .map((role) => role.id);

        if (rolesToRemove.length) await user.roles.remove(rolesToRemove).catch(() => null);
        if (!user.roles.cache.has(wency.unregisteredRole)) await user.roles.add(wency.unregisteredRole).catch(() => null);

        await message.react('✅').catch(() => null);
        return message.reply({ content: `${user} kullanıcısı ${message.author} tarafından kayıtsıza atıldı.` });
    }
};
