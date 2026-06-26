const { PermissionsBitField: { Flags } } = require('discord.js');
const ms = require('ms');
const Giveaway = require('../../../Schema/Giveaway');
const { createGiveawayMessage } = require('../../../Base/Giveaway');

function parseDuration(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const duration = ms(value.trim());
        return Number.isFinite(duration) ? duration : null;
    } catch {
        return null;
    }
}

module.exports = {
    name: 'cekilis',
    aliases: ['çekiliş', 'giveaway'],
    category: 'Auth',

    execute: async (client, message, args, settings) => {
        const authRoles = Array.isArray(settings?.auth) ? settings.auth : [];
        const isAuthorized = message.member.permissions.has(Flags.Administrator) ||
            authRoles.some((roleId) => message.member.roles.cache.has(roleId));
        if (!isAuthorized) return message.reply({ content: 'Bu komutu kullanma yetkin bulunmuyor.' });

        const duration = parseDuration(args[0]);
        const winnerCount = Number(args[1]);
        const prize = args.slice(2).join(' ').trim();

        if (!duration || duration < 10_000 || duration > 1000 * 60 * 60 * 24 * 30) {
            return message.reply({ content: 'Geçerli bir süre belirtmelisin. Örnek: `.cekilis 10m 1 Boostlu Nitro`' });
        }
        if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 20) {
            return message.reply({ content: 'Kazanan sayısı 1 ile 20 arasında olmalı.' });
        }
        if (!prize || prize.length > 200) {
            return message.reply({ content: 'Çekiliş ödülünü belirtmelisin.' });
        }

        const giveaway = await Giveaway.create({
            guildId: message.guild.id,
            channelId: message.channel.id,
            hostId: message.author.id,
            prize,
            winnerCount,
            endsAt: new Date(Date.now() + duration)
        });

        try {
            await createGiveawayMessage(message.channel, giveaway);
            await message.delete().catch(() => null);
        } catch (error) {
            await Giveaway.deleteOne({ _id: giveaway._id }).catch(() => null);
            throw error;
        }
    }
};
