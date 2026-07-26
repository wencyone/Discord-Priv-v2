const { EmbedBuilder } = require('discord.js');

async function sendAffLog(guild, title, fields, color = 0x5865f2) {
    const channel = guild.channels.cache.find((item) => item.name === 'aff-log')
        || await findAffLogChannel(guild);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(fields)
        .setTimestamp();

    return channel.send({
        embeds: [embed],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}

async function findAffLogChannel(guild) {
    await guild.channels.fetch().catch(() => null);
    return guild.channels.cache.find((item) => item.name === 'aff-log');
}

module.exports = { sendAffLog };
