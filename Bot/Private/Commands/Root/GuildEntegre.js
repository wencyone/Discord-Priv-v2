const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { EmbedBuilder } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const { getUserGuildTag } = require('../../../Base/GuildTagRole');

module.exports = {
    name: 'guildentegre',
    aliases: ['guild-entegre', 'tagentegre', 'tag-entegre'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        const settings = await Settings.findOne({ id: message.guild.id });
        if (!settings?.guildTagRole) return message.reply({ content: 'Guild Tag Rolü ayarlanmamış. `.kur` menüsünden Guild Tag Rolü seçmelisin.' });

        const role = message.guild.roles.cache.get(settings.guildTagRole);
        if (!role) return message.reply({ content: 'Ayarlı Guild Tag Rolü sunucuda bulunamadı.' });
        if (role.managed || role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ content: 'Guild Tag Rolü botun en yüksek rolünden aşağıda olmalı.' });
        }

        const statusMessage = await message.reply({ content: 'Guild tag entegrasyonu başlatıldı. Üyeler taranıyor...' });
        const members = await message.guild.members.fetch();

        let tagged = 0;
        let alreadyHasRole = 0;
        let given = 0;
        let failed = 0;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            const user = await client.users.fetch(member.id, { force: true }).catch(() => member.user);
            const guildTag = getUserGuildTag(user, message.guild.id);
            if (!guildTag) continue;

            tagged++;
            if (member.roles.cache.has(role.id)) {
                alreadyHasRole++;
                continue;
            }

            try {
                await member.roles.add(role, `.guildentegre | Guild tag rol entegrasyonu`);
                given++;
            } catch (error) {
                failed++;
                console.error(`[GUILD_ENTEGRE] ${member.id}:`, error);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('Guild Tag Entegrasyonu')
            .setColor(failed ? 0xfee75c : 0x57f287)
            .setDescription([
                `• Taranan Üye: **${members.filter((member) => !member.user.bot).size}**`,
                `• Guild Tagli Üye: **${tagged}**`,
                `• Rol Verilen: **${given}**`,
                `• Zaten Rolü Olan: **${alreadyHasRole}**`,
                `• Başarısız: **${failed}**`,
                `• Rol: ${role}`,
                `• Yetkili: ${message.author}`,
            ].join('\n'))
            .setTimestamp();

        await statusMessage.edit({ content: 'Guild tag entegrasyonu tamamlandı.', embeds: [embed] }).catch(() => null);

        const logChannel = message.guild.channels.cache.find((channel) => channel.name === 'guild-log');
        if (logChannel?.isTextBased()) {
            await logChannel.send({
                embeds: [embed],
                allowedMentions: { parse: [], users: [], roles: [] },
            }).catch(() => null);
        }
    },
};
