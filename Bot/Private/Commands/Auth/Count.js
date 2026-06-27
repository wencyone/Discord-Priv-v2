const { PermissionsBitField: { Flags }, EmbedBuilder, bold, inlineCode } = require('discord.js');

function hasGuildTag(member, guildId) {
    const primaryGuild = member.user?.primaryGuild || member.user?.primary_guild;
    if (!primaryGuild) return false;

    const identityGuildId = primaryGuild.identityGuildId || primaryGuild.identity_guild_id || primaryGuild.guildId || primaryGuild.guild_id || primaryGuild.id;
    const identityEnabled = primaryGuild.identityEnabled ?? primaryGuild.identity_enabled;

    return identityGuildId === guildId && identityEnabled !== false;
}

module.exports = {
    name: 'say',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency.auth.some(x => message.member.roles.cache.has(x)))
            return message.reply({ content: 'Yetkin yok.' });

        const totalMember = message.guild.memberCount;
        const onlineMember = message.guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size
        const voiceMember = message.guild.members.cache.filter(m => m.voice.channel).size
        const taggedMember = message.guild.members.cache.filter(m => hasGuildTag(m, message.guild.id)).size

        const embed = new EmbedBuilder({
            description: [
                `${inlineCode(' > ')} Sunucuda toplam ${bold(voiceMember)} kullanıcı ses kanallarında bulunuyor.`,
                `${inlineCode(' > ')} Sunucumuz da ${bold(totalMember)} üye bulunmakta. (${bold(onlineMember)} Aktif)`,
                `${inlineCode(' > ')} Sunucumuzun guild tagını ${bold(taggedMember)} kullanıcı kullanıyor.`,
                `${inlineCode(' > ')} Toplamda ${bold(message.guild.premiumSubscriptionCount)} adet boost basılmış.`
            ].join('\n'),
        });

        message.channel.send({ embeds: [embed] });
    }
}
