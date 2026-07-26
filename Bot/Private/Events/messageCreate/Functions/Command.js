const { EmbedBuilder, inlineCode } = require('discord.js')
const Settings = require('../../../../Schema/Settings')
const { hasOwnerRole } = require('../../../../Base/OwnerRole')

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
        if (cmd.category === 'Root' && !hasOwnerRole(message.member, document)) {
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Owner Rollerinden birine sahip olmalısın.' });
        }

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
            await sendCommandLog(message, document, cmd, commands);
        } catch (error) {
            console.error(`[COMMAND ERROR] ${cmd.name || commands}:`, error);
            await message.reply({ content: 'Komut çalıştırılırken beklenmeyen bir hata oluştu.' }).catch(() => null);
        }
    }
}

async function sendCommandLog(message, document, cmd, commandName) {
    const logChannel = message.guild.channels.cache.get(document.commandLogChannel)
        || message.guild.channels.cache.find((channel) => channel.name === 'command-log');
    if (!logChannel?.isTextBased()) return;

    const content = message.content.length > 1800 ? `${message.content.slice(0, 1797)}...` : message.content;
    await logChannel.send({
        content: `🔧 ${message.author.username} (${message.author.id}) kullanıcısı **${cmd.name || commandName}** komutunu **${message.channel.name}** kanalında (${inlineCode(content)}) kullandı!`,
        allowedMentions: { parse: [], users: [], roles: [] }
    }).catch(() => null);
}
