const { Events, codeBlock, EmbedBuilder } = require('discord.js');

client.on(Events.Raw, async (packet) => {
    try {
        if (packet.t !== 'MESSAGE_REACTION_REMOVE') return;

        const guild = client.guilds.cache.get(packet.d.guild_id);
        if (!guild) return;

        const user = await client.users.fetch(packet.d.user_id).catch(() => null);
        if (!user || user.bot) return;

        const messageChannel = guild.channels.cache.get(packet.d.channel_id)
            || await guild.channels.fetch(packet.d.channel_id).catch(() => null);
        if (!messageChannel || !messageChannel.isTextBased()) return;

        const message = await messageChannel.messages.fetch(packet.d.message_id).catch(() => null);
        const logChannel = guild.channels.cache.find((c) => c.name === 'emoji-log');
        if (!logChannel || !logChannel.isTextBased()) return;

        const emoji = packet.d.emoji.id ? `<:${packet.d.emoji.name}:${packet.d.emoji.id}> (${packet.d.emoji.name}:${packet.d.emoji.id})` : packet.d.emoji.name;

        const embed = new EmbedBuilder({
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL({ extension: 'png', size: 4096 })
            },
            title: 'Mesaj Emojisi Silindi',
            description: [
                codeBlock('yaml', [
                    '# Bilgilendirme',
                    `→ Kanal: ${messageChannel.name}`,
                    `→ Mesaj ID: ${packet.d.message_id}`,
                    `→ Mesaj Sahibi: ${message?.author ? `${message.author.username} (${message.author.id})` : 'Bulunamadı'}`,
                    `→ Emojiyi Silen: ${user.username} (${user.id})`,
                    `→ Silinen Emoji: ${emoji}`,
                    `→ Mesaj Linki: https://discord.com/channels/${packet.d.guild_id}/${packet.d.channel_id}/${packet.d.message_id}`,
                    `→ Gönderilme Tarihi: ${message?.createdTimestamp ? date(message.createdTimestamp) : 'Bulunamadı'}`,
                    `→ Silinme Tarihi: ${date(Date.now())}`,
                ].join('\n')),
            ].join('\n'),
        });

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
        console.error('[RAW_MESSAGE_REACTION_REMOVE]', error);
    }
});

function date(date) {
    return new Date(date).toLocaleString('tr-TR', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
}
