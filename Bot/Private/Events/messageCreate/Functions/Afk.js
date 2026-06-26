module.exports = async function Afk(client, message, prefix) {
    if (!message.guild || !message.author || message.author.bot) return;

    const selfAfk = client.afks.get(message.author.id);
    const isAfkCommand = prefix && message.content.toLowerCase().startsWith(`${prefix}afk`);

    if (selfAfk && !isAfkCommand) {
        client.afks.delete(message.author.id);
        const welcomeMessage = await message.reply({
            content: `Hos geldin ${message.author}. **${formatDuration(Date.now() - selfAfk.date)}** suredir AFK idin.`,
        }).catch(() => null);
        if (welcomeMessage) {
            setTimeout(() => {
                welcomeMessage.delete().catch(() => null);
            }, 15000);
        }
    }

    if (!message.mentions.users.size) return;

    const afkUsers = message.mentions.users
        .filter((u) => client.afks.has(u.id))
        .map((u) => {
            const afkData = client.afks.get(u.id);
            return `${u} su an AFK.\nSebep: **${afkData.reason || 'Sebep belirtilmedi.'}**\nAFK suresi: **${formatDuration(Date.now() - afkData.date)}**`;
        });

    if (!afkUsers.length) return;

    await message.reply({
        content: afkUsers.join('\n\n'),
        allowedMentions: { users: [] },
    }).catch(() => null);
};

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days) parts.push(`${days}g`);
    if (hours) parts.push(`${hours}s`);
    if (minutes) parts.push(`${minutes}dk`);
    parts.push(`${seconds}sn`);
    return parts.join(' ');
}
