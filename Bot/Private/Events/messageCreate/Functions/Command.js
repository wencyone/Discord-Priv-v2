const { EmbedBuilder, inlineCode } = require('discord.js')
const Settings = require('../../../../Schema/Settings')
const { hasOwnerRole } = require('../../../../Base/OwnerRole')

const commandCooldowns = new Map();
const COMMAND_COOLDOWN = 5000;
const SUCCESS_REACTION = '✅';
const FAIL_REACTION = '❌';

const failurePatterns = [
    'yetkin yok',
    'kullanmak için',
    'belirtmelisin',
    'geçerli',
    'bulunamadı',
    'bulunmuyor',
    'ayarlanmamış',
    'olmalı',
    'yapamazsın',
    'banlayamazsın',
    'banlayamam',
    'atamazsın',
    'zaten',
    'hata',
    'missing permissions',
    'beklemelisin',
];

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
    if (!cmd) return reactCommand(message, false);

    if (cmd) {
        if (cmd.category === 'Root' && !hasOwnerRole(message.member, document)) {
            await reactCommand(message, false);
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Owner Rollerinden birine sahip olmalısın.' });
        }

        const isBotOwner = Array.isArray(global.system?.ownerID) && global.system.ownerID.includes(message.author.id);
        if (!isBotOwner) {
            const cooldown = commandCooldowns.get(message.author.id) || 0;
            const now = Date.now();
            if (cooldown > now) {
                const remaining = Math.ceil((cooldown - now) / 1000);
                await reactCommand(message, false);
                return message.reply({ content: `Komut kullanmak için ${remaining} saniye beklemelisin.` })
                    .then((msg) => setTimeout(() => msg.delete().catch(() => null), 3000))
                    .catch(() => null);
            }

            commandCooldowns.set(message.author.id, now + COMMAND_COOLDOWN);
            setTimeout(() => commandCooldowns.delete(message.author.id), COMMAND_COOLDOWN);
        }

        let commandFailed = false;
        const restoreMessage = watchCommandResult(message, () => commandFailed = true);

        try {
            await cmd.execute(client, message, args, document, embed);
            restoreMessage();
            await reactCommand(message, !commandFailed);
            if (!commandFailed) await sendCommandLog(message, document, cmd, commands);
        } catch (error) {
            restoreMessage();
            console.error(`[COMMAND ERROR] ${cmd.name || commands}:`, error);
            await reactCommand(message, false);
            await message.reply({ content: 'Komut çalıştırılırken beklenmeyen bir hata oluştu.' }).catch(() => null);
        }
    }
}

function watchCommandResult(message, markFailed) {
    const originalReply = message.reply.bind(message);
    const originalSend = message.channel.send.bind(message.channel);

    message.reply = (...args) => {
        if (isFailurePayload(args[0])) markFailed();
        return originalReply(...args);
    };

    message.channel.send = (...args) => {
        if (isFailurePayload(args[0])) markFailed();
        return originalSend(...args);
    };

    return () => {
        message.reply = originalReply;
        message.channel.send = originalSend;
    };
}

function isFailurePayload(payload) {
    const content = getPayloadContent(payload).toLocaleLowerCase('tr-TR');
    if (!content) return false;
    return failurePatterns.some((pattern) => content.includes(pattern));
}

function getPayloadContent(payload) {
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload.content === 'string') return payload.content;
    if (!payload.embeds?.length) return '';

    return payload.embeds.map((embed) => [
        embed.data?.title || embed.title,
        embed.data?.description || embed.description,
        ...(embed.data?.fields || embed.fields || []).map((field) => `${field.name || ''} ${field.value || ''}`)
    ].filter(Boolean).join(' ')).join(' ');
}

function reactCommand(message, success) {
    return message.react(success ? SUCCESS_REACTION : FAIL_REACTION).catch(() => null);
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
