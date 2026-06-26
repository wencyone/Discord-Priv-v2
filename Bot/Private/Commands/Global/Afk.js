module.exports = {
    name: 'afk',
    aliases: [],
    category: 'Global',

    execute: async (client, message, args) => {
        if (!message.guild || !message.author) return;

        const reason = (args.join(' ').trim() || 'Sebep belirtilmedi.').slice(0, 250);
        client.afks.set(message.author.id, {
            reason,
            date: Date.now(),
            guildId: message.guild.id,
        });

        return message.reply({
            content: `AFK moduna girdin.${reason ? ` Sebep: **${reason}**` : ''}`,
        });
    },
};
