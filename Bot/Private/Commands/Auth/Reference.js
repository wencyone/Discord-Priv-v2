const {
    PermissionsBitField: { Flags },
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function getPrimaryGuildData(user) {
    const primaryGuild = user?.primaryGuild || user?.primary_guild;
    if (!primaryGuild) return null;

    return {
        guildId: primaryGuild.identityGuildId || primaryGuild.identity_guild_id || primaryGuild.guildId || primaryGuild.guild_id || primaryGuild.id,
        tag: primaryGuild.tag,
        identityEnabled: primaryGuild.identityEnabled ?? primaryGuild.identity_enabled
    };
}

async function checkBannedGuildTag(client, userId, wency) {
    const bannedGuildTags = Array.isArray(wency.bannedGuildTags) ? wency.bannedGuildTags : [];
    if (!bannedGuildTags.length) return null;

    const fetchedUser = await client.users.fetch(userId, { force: true }).catch(() => null);
    const primaryGuild = getPrimaryGuildData(fetchedUser);
    if (!primaryGuild?.guildId || primaryGuild.identityEnabled === false) return null;

    return bannedGuildTags.find((entry) => entry.guildId === primaryGuild.guildId) || null;
}

module.exports = {
    name: 'key',
    aliases: ['kayıt', 'kayit', 'referans', 'e', 'k'],
    category: 'Auth',

    execute: async (client, message, args, wency, embed) => {
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
            return message.reply({ content: 'Kendini kayıt edemezsin.' });
        if (message.member.roles.highest.id === user?.roles?.highest?.id)
            return message.reply({ content: 'Kendi rolündeki kişiyi kayıt edemezsin.' });
        if (user?.roles?.highest?.rawPosition >= message.member?.roles?.highest?.rawPosition)
            return message.reply({ content: 'Yetkili olduğun kişiyi kayıt edemezsin.' });
        if (message.guild?.members.me?.roles.highest.id === user?.roles?.highest?.id)
            return message.reply({ content: 'Botun rolündeki kişiyi kayıt edemezsin..' });

        const bannedGuildTag = await checkBannedGuildTag(client, user.id, wency);
        if (bannedGuildTag) {
            return message.reply({
                content: `Bu kullanıcı yasaklı guild taginde olduğu için kayıt edilemez. Yasaklı sunucu: ${bannedGuildTag.name || bannedGuildTag.guildId}${bannedGuildTag.tag ? ` [${bannedGuildTag.tag}]` : ''}`
            });
        }

        if (wency.manRole && wency.womanRole) {
            if (user.roles.cache.has(wency.manRole) || user.roles.cache.has(wency.womanRole))
                return message.reply({ content: 'Bu kullanıcı zaten kayıtlı.' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`register_man_${user.id}_${message.author.id}`)
                    .setLabel('Erkek')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`register_woman_${user.id}_${message.author.id}`)
                    .setLabel('Kadın')
                    .setStyle(ButtonStyle.Danger)
            );

            const question = await message.reply({
                content: `${user} kullanıcısını kayıt etmek için cinsiyet seç.`,
                components: [row]
            });

            const collector = question.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 30000
            });

            collector.on('collect', async (i) => {
                const selectedRole = i.customId.startsWith('register_man_') ? wency.manRole : wency.womanRole;
                const gender = i.customId.startsWith('register_man_') ? 'erkek' : 'kadın';

                await user.roles.add(selectedRole).catch(() => null);
                if (user.roles.cache.has(wency.unregisteredRole)) await user.roles.remove(wency.unregisteredRole).catch(() => null);

                await i.update({
                    content: `${user} kullanıcısı ${message.author} tarafından ${gender} olarak kayıt edildi.`,
                    components: []
                }).catch(() => null);
                await message.react('✅').catch(() => null);
                collector.stop('registered');
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'registered') return;
                await question.edit({ content: 'Kayıt işleminin süresi doldu.', components: [] }).catch(() => null);
            });

            return;
        }

        if (user.roles.cache.has(wency.registeredRole))
            return message.reply({ content: 'Bu kullanıcı zaten kayıtlı.' });

        if (!wency.registeredRole)
            return message.reply({ content: 'Kayıtlı rolü ayarlanmamış.' });

        await user.roles.add(wency.registeredRole).catch(() => null);
        if (user.roles.cache.has(wency.unregisteredRole)) await user.roles.remove(wency.unregisteredRole).catch(() => null);

        await message.react('✅').catch(() => null);
        return message.reply({ content: `${user} kullanıcısı ${message.author} tarafından kayıt edildi.` });
    }
};
