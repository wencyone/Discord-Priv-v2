const { Events } = require('discord.js');
const { Special, Link, Command, Afk, Stat, Guard } = require('./Functions');
const GifProtection = require('./Functions/Gif');
const Gif = typeof GifProtection === 'function' ? GifProtection : GifProtection?.Gif;

client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.guild.id !== system.serverID) {
        await message.guild.leave();
        return;
    }

    // Gif Protection System
    if (typeof Gif === 'function') {
        const isGifDeleted = await Gif(client, message);
        if (isGifDeleted) return;
    }

    if (!message.content) return;

    const prefixes = [...system.Private.Prefix, `<@${client.user.id}>`, `<@!${client.user.id}>`]
    const prefix = prefixes.find((p) => message.content.startsWith(p))

    Special(client, message, prefix)
    Link(client, message)
    Command(client, message, prefix)
    Afk(client, message, prefix)
    await Stat(client, message).catch((error) => console.error(`[MESSAGE STAT] ${error.message}`));
    Guard(message)
})
