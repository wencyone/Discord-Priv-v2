const {
    ActionRowBuilder,
    AuditLogEvent,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    bold,
    inlineCode,
} = require('discord.js');
const { createRole, createChannel, createExpression } = require('../../../Utils/Functions');
const RoleModel = require('../../../../Schema/RoleModel');
const ChannelModel = require('../../../../Schema/ChannelModel');
const ExpressionModel = require('../../../../Schema/ExpressionModel');
const { emojis, panel, wait, expired } = require('../../Panel');

const DAY = 24 * 60 * 60 * 1000;

module.exports = {
    name: 'denetim',
    aliases: ['audit'],

    execute: async (client, message) => {
        const { arrow, point } = await emojis(client);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('audit:role').setLabel('Rol Denetim').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('audit:channel').setLabel('Kanal Denetim').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('audit:expression').setLabel('Emoji / Sticker').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('audit:ban').setLabel('Ban Denetim').setStyle(ButtonStyle.Secondary),
        );

        const question = await message.channel.send(panel([
            `${message.author} sunucu denetim paneline hoş geldin.\nSon 24 saatte gerçekleşen kritik işlemleri buradan kontrol edebilirsin.`,
            `${arrow} ${bold('Denetim Merkezi')}\n${point} Silinen verileri görüntüleyebilir ve yedekten yeniden kurabilirsin.`,
        ], [row]));

        const interaction = await wait(question, message.author.id, ['audit:role', 'audit:channel', 'audit:expression', 'audit:ban']);
        if (!interaction) return expired(question, client);
        await interaction.deferUpdate();

        if (interaction.customId === 'audit:role') return showRoles(client, message, question);
        if (interaction.customId === 'audit:channel') return showChannels(client, message, question);
        if (interaction.customId === 'audit:expression') return showExpressions(client, message, question);
        return showBans(client, message, question);
    }
};

function deletedName(entry) {
    return entry.changes?.find((change) => change.key === 'name')?.old || entry.target?.name || 'Bilinmiyor';
}

function recent(entries) {
    return [...entries.values()]
        .filter((entry) => entry.createdTimestamp > Date.now() - DAY)
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
}

function auditLines(entries, point, type) {
    return entries.slice(0, 20).map((entry) => {
        const name = type === 'ban' ? entry.target?.username || 'Bilinmeyen Kullanıcı' : deletedName(entry);
        return `${point} ${bold(name)} • ${inlineCode(entry.targetId)} • <t:${Math.floor(entry.createdTimestamp / 1000)}:R>`;
    }).join('\n');
}

async function showRoles(client, message, question) {
    const { arrow, point, mark } = await emojis(client);
    const logs = recent((await message.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete })).entries);
    if (!logs.length) return question.edit(panel([
        `${mark} ${bold('Silinen Rol Bulunamadı')}`,
        `${point} Son 24 saat içinde silinmiş rol bulunmuyor.`,
    ]));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('audit:restore:role').setLabel('Rolü Yedekten Kur').setStyle(ButtonStyle.Secondary)
    );
    await question.edit(panel([
        `${arrow} ${bold('Son 24 Saatte Silinen Roller')}\n${point} Toplam kayıt: ${inlineCode(String(logs.length))}`,
        auditLines(logs, point, 'role'),
        `${point} Kurmak istediğin rolün ID bilgisini aşağıdaki butona basarak gir.`,
    ], [row]));

    const interaction = await wait(question, message.author.id, ['audit:restore:role']);
    if (!interaction) return expired(question, client);
    return restoreFromModal(client, message, interaction, 'role');
}

async function showChannels(client, message, question) {
    const { arrow, point, mark } = await emojis(client);
    const logs = recent((await message.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete })).entries);
    if (!logs.length) return question.edit(panel([
        `${mark} ${bold('Silinen Kanal Bulunamadı')}`,
        `${point} Son 24 saat içinde silinmiş kanal bulunmuyor.`,
    ]));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('audit:restore:channel').setLabel('Kanalı Yedekten Kur').setStyle(ButtonStyle.Secondary)
    );
    await question.edit(panel([
        `${arrow} ${bold('Son 24 Saatte Silinen Kanallar')}\n${point} Toplam kayıt: ${inlineCode(String(logs.length))}`,
        auditLines(logs, point, 'channel'),
        `${point} Kurmak istediğin kanalın ID bilgisini aşağıdaki butona basarak gir.`,
    ], [row]));

    const interaction = await wait(question, message.author.id, ['audit:restore:channel']);
    if (!interaction) return expired(question, client);
    return restoreFromModal(client, message, interaction, 'channel');
}

async function showExpressions(client, message, question) {
    const { arrow, point, mark } = await emojis(client);
    const emojiLogs = recent((await message.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete })).entries)
        .map((entry) => ({ entry, expressionType: 'emoji' }));
    const stickerLogs = recent((await message.guild.fetchAuditLogs({ type: AuditLogEvent.StickerDelete })).entries)
        .map((entry) => ({ entry, expressionType: 'sticker' }));
    const logs = [...emojiLogs, ...stickerLogs].sort((a, b) => b.entry.createdTimestamp - a.entry.createdTimestamp);

    if (!logs.length) return question.edit(panel([
        `${mark} ${bold('Silinen Emoji veya Sticker Bulunamadı')}`,
        `${point} Son 24 saat içinde silinmiş emoji veya sticker bulunmuyor.`,
    ]));

    const lines = logs.slice(0, 20).map(({ entry, expressionType }) =>
        `${point} ${bold(deletedName(entry))} (${expressionType === 'emoji' ? 'Emoji' : 'Sticker'}) • ${inlineCode(entry.targetId)} • <t:${Math.floor(entry.createdTimestamp / 1000)}:R>`
    ).join('\n');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('audit:restore:emoji').setLabel('Emoji Kur').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('audit:restore:sticker').setLabel('Sticker Kur').setStyle(ButtonStyle.Secondary),
    );
    await question.edit(panel([
        `${arrow} ${bold('Son 24 Saatte Silinen Emoji ve Stickerlar')}\n${point} Toplam kayıt: ${inlineCode(String(logs.length))}`,
        lines,
        `${point} Kurmak istediğin öğenin türünü seçip eski ID bilgisini gir.`,
    ], [row]));

    const interaction = await wait(question, message.author.id, ['audit:restore:emoji', 'audit:restore:sticker']);
    if (!interaction) return expired(question, client);
    return restoreFromModal(client, message, interaction, interaction.customId.endsWith('emoji') ? 'emoji' : 'sticker');
}

async function showBans(client, message, question) {
    const { arrow, point, mark } = await emojis(client);
    const logs = recent((await message.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd })).entries);
    if (!logs.length) return question.edit(panel([
        `${mark} ${bold('Ban Kaydı Bulunamadı')}`,
        `${point} Son 24 saat içinde yasaklanmış kullanıcı bulunmuyor.`,
    ]));

    return question.edit(panel([
        `${arrow} ${bold('Son 24 Saatte Yasaklanan Kullanıcılar')}\n${point} Toplam kayıt: ${inlineCode(String(logs.length))}`,
        auditLines(logs, point, 'ban'),
    ]));
}

async function restoreFromModal(client, message, interaction, type) {
    const labels = {
        role: ['Rol', 'Silinen Rolü Kur'],
        channel: ['Kanal', 'Silinen Kanalı Kur'],
        emoji: ['Emoji', 'Silinen Emojiyi Kur'],
        sticker: ['Sticker', 'Silinen Stickerı Kur'],
    };
    const [label, title] = labels[type];
    const modalId = `audit:modal:${type}:${interaction.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(title)
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('id')
                .setLabel(`${label} ID`)
                .setPlaceholder('123456789123456789')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));

    await interaction.showModal(modal);
    const submitted = await interaction.awaitModalSubmit({
        filter: (modalInteraction) => modalInteraction.user.id === message.author.id && modalInteraction.customId === modalId,
        time: 60000,
    }).catch(() => null);
    if (!submitted) return;

    const { point, check, mark } = await emojis(client);
    const id = submitted.fields.getTextInputValue('id').trim();
    await submitted.reply(panel([
        `${point} ${bold(`${label} Geri Yükleniyor`)}`,
        `${point} Yedek kaydı kontrol ediliyor.`,
    ], [], false, true));

    try {
        if (type === 'role') {
            const document = await RoleModel.findOne({ guild: message.guild.id, role: id });
            if (!document) return submitted.editReply(panel([`${mark} ${bold('Rol Yedeği Bulunamadı')}`, `${point} ${inlineCode(id)} ID'li rol veritabanında bulunmuyor.`]));
            await createRole(client, document, true);
        } else if (type === 'channel') {
            const document = await ChannelModel.findOne({ guild: message.guild.id, channel: id });
            if (!document) return submitted.editReply(panel([`${mark} ${bold('Kanal Yedeği Bulunamadı')}`, `${point} ${inlineCode(id)} ID'li kanal veritabanında bulunmuyor.`]));
            await createChannel(client, document);
        } else {
            const document = await ExpressionModel.findOne({ guild: message.guild.id, expression: id });
            if (!document) return submitted.editReply(panel([`${mark} ${bold(`${label} Yedeği Bulunamadı`)}`, `${point} ${inlineCode(id)} ID'li kayıt veritabanında bulunmuyor.`]));
            await createExpression(client, id, type);
        }

        return submitted.editReply(panel([
            `${check} ${bold(`${label} Başarıyla Kuruldu`)}`,
            `${point} ${inlineCode(id)} ID'li yedek sunucuya geri yüklendi.`,
        ]));
    } catch (error) {
        return submitted.editReply(panel([
            `${mark} ${bold(`${label} Kurulamadı`)}`,
            `${point} ${error?.message || 'Bilinmeyen bir hata oluştu.'}`,
        ]));
    }
}
