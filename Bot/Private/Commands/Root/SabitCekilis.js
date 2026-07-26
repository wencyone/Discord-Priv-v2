const ms = require('ms');
const Giveaway = require('../../../Schema/Giveaway');
const { hasOwnerRole } = require('../../../Base/OwnerRole');
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
    name: 'sabitcekilis',
    aliases: ['sabitçekiliş', 'hilelicekilis', 'hileliçekiliş'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) {
            return message.reply({ content: 'Bu komutu sadece bot owner kullanabilir.' });
        }

        const winner = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!winner || winner.user.bot) {
            return message.reply({ content: 'Geçerli bir kazanan belirtmelisin.' });
        }

        const duration = parseDuration(args[1]);
        const prize = args.slice(2).join(' ').trim();

        if (!duration || duration < 10_000 || duration > 1000 * 60 * 60 * 24 * 30) {
            return message.reply({ content: 'Geçerli bir süre belirtmelisin. Örnek: `.sabitcekilis @kullanıcı 10m Boostlu Nitro`' });
        }
        if (!prize || prize.length > 200) {
            return message.reply({ content: 'Çekiliş ödülünü belirtmelisin.' });
        }

        const giveaway = await Giveaway.create({
            guildId: message.guild.id,
            channelId: message.channel.id,
            hostId: message.author.id,
            prize,
            winnerCount: 1,
            endsAt: new Date(Date.now() + duration),
            predeterminedWinnerId: winner.id,
            predeterminedDisclosed: true
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
