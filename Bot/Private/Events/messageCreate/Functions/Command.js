const { EmbedBuilder } = require('discord.js')
const Settings = require('../../../../Schema/Settings')

const commandCooldowns = new Map();
const COMMAND_COOLDOWN = 5000;

module.exports = async function Command(client, message, prefix) {
    let document = await Settings.findOne({ id: message.guild.id })
    if (!document) {
        document = new Settings({ id: message.guild.id })
        await document.save()
    }

    const embed = new EmbedBuilder({
        author: {
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL({ extension: 'png', size: 4096 })
        }
    });

    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commands = args.shift().toLowerCase();
    const cmd = client.commands.get(commands) || [...client.commands.values()].find((e) => e.aliases && e.aliases.includes(commands));
    if (cmd) {
        const isBotOwner = Array.isArray(global.system?.ownerID) && global.system.ownerID.includes(message.author.id);
        if (!isBotOwner) {
            const cooldown = commandCooldowns.get(message.author.id) || 0;
            const now = Date.now();
            if (cooldown > now) {
                const remaining = Math.ceil((cooldown - now) / 1000);
                return message.reply({ content: `Komut kullanmak için ${remaining} saniye beklemelisin.` })
                    .then((msg) => setTimeout(() => msg.delete().catch(() => null), 3000))
                    .catch(() => null);
            }

            commandCooldowns.set(message.author.id, now + COMMAND_COOLDOWN);
            setTimeout(() => commandCooldowns.delete(message.author.id), COMMAND_COOLDOWN);
        }

        try {
            await cmd.execute(client, message, args, document, embed);
        } catch (error) {
            console.error(`[COMMAND ERROR] ${cmd.name || commands}:`, error);
            await message.reply({ content: 'Komut çalıştırılırken beklenmeyen bir hata oluştu.' }).catch(() => null);
        }
    }
}
