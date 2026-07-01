const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    RoleSelectMenuBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    UserSelectMenuBuilder,
    bold,
    inlineCode,
} = require('discord.js');
const Settings = require('../../../../Schema/GuardSettings');

function whitelistKey(item) {
    return String(item?.key || item?.id || '').trim();
}

function whitelistAccess(item) {
    if (Array.isArray(item?.access) && item.access.length) return item.access;
    return [{
        type: item?.action || 'full',
        limit: item?.limit || 0,
        punish: item?.punish || 'pull',
    }];
}

function whitelistTypeLabel(type) {
    return type === 'full' ? 'Full Erişim'
        : type === 'blackList' ? 'BlackList'
            : type === 'guildUpdate' ? 'Sunucu Güncellemeleri'
                : type === 'memberUpdate' ? 'Üye Güncellemeleri'
                    : type === 'channel' ? 'Kanal'
                        : type === 'role' ? 'Rol'
                            : type === 'emoji' ? 'Emoji/Sticker'
                                : type || 'Bilinmiyor';
}

function whitelistPunishLabel(punish) {
    return punish === 'pull' ? 'Yetki Çek' : punish === 'ban' ? 'Ban' : punish === 'kick' ? 'Kick' : punish || 'Yetki Çek';
}

async function getDesignEmojis(client) {
    const emoji = async (name, fallback) => {
        if (typeof client.getEmoji !== 'function') return fallback;
        return await client.getEmoji(name).catch(() => null) || fallback;
    };

    return {
        arrow: await emoji('arrow', '›'),
        point: await emoji('point', '•'),
        check: await emoji('check', '✅'),
        mark: await emoji('mark', '❌'),
    };
}

function createPanel(sections, rows = [], disabled = false) {
    const container = new ContainerBuilder();
    const content = sections.filter(Boolean);

    content.forEach((section, index) => {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(String(section).slice(0, 3900)));
        if (index < content.length - 1 || rows.length) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );
        }
    });

    rows.forEach((row) => {
        if (disabled) row.components.forEach((component) => component.setDisabled(true));
        container.addActionRowComponents(row);
    });

    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

async function waitForComponent(message, userId, customIds, time = 60000) {
    return message.awaitMessageComponent({
        filter: (interaction) => interaction.user.id === userId && customIds.includes(interaction.customId),
        time,
    }).catch(() => null);
}

async function showExpired(message, client) {
    const { mark } = await getDesignEmojis(client);
    return message.edit(createPanel([
        `${mark} ${bold('İşlem Süresi Doldu')}`,
        'Güvenli liste paneli kapatıldı. Komutu yeniden kullanabilirsin.',
    ])).catch(() => null);
}

module.exports = {
    name: 'güvenli',
    aliases: ['whitelist', 'wl'],

    execute: async (client, message, args) => {
        const action = args[0]?.toLocaleLowerCase('tr-TR');

        if (!action) return showDashboard(client, message);
        if (action === 'ekle') return addWhitelist(client, message);
        if (action === 'çıkar' || action === 'cikar') return removeWhitelist(client, message);
        if (action === 'liste') return listWhitelist(client, message);

        return message.reply({ content: 'Geçerli işlemler: `ekle`, `çıkar`, `liste`' });
    }
};

async function showDashboard(client, message) {
    const document = await Settings.findOne({ guildID: message.guild.id });
    const whitelist = Array.isArray(document?.whitelist) ? document.whitelist : [];
    const roleCount = whitelist.filter((item) => message.guild.roles.cache.has(whitelistKey(item))).length;
    const userCount = whitelist.length - roleCount;
    const { arrow, point } = await getDesignEmojis(client);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl:add').setLabel('Güvenli Ekle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('wl:remove').setLabel('Güvenli Çıkar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('wl:list').setLabel('Güvenli Liste').setStyle(ButtonStyle.Secondary),
    );

    const panel = createPanel([
        `${message.author} güvenli liste yönetim paneline hoş geldin.\nAşağıdaki butonlardan yapmak istediğin işlemi seçebilirsin.`,
        [
            `${arrow} ${bold('Güvenli Liste Özeti')}`,
            `${point} Toplam Kayıt: ${inlineCode(String(whitelist.length))}`,
            `${point} Kullanıcı Sayısı: ${inlineCode(String(userCount))}`,
            `${point} Rol Sayısı: ${inlineCode(String(roleCount))}`,
        ].join('\n'),
    ], [row]);

    const question = await message.channel.send(panel);
    const interaction = await waitForComponent(question, message.author.id, ['wl:add', 'wl:remove', 'wl:list']);
    if (!interaction) return showExpired(question, client);

    await interaction.deferUpdate();
    if (interaction.customId === 'wl:add') return addWhitelist(client, message, question);
    if (interaction.customId === 'wl:remove') return removeWhitelist(client, message, question);
    return listWhitelist(client, message, question);
}

async function addWhitelist(client, message, question = null) {
    const { arrow, point, check } = await getDesignEmojis(client);
    const targetRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl:add:role').setLabel('Rol Ekle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('wl:add:user').setLabel('Kullanıcı Ekle').setStyle(ButtonStyle.Secondary),
    );
    const targetPanel = createPanel([
        `${arrow} ${bold('Güvenli Listeye Ekle')}`,
        `${point} Güvenli listeye eklemek istediğin kayıt türünü seç.\n${point} Sonraki adımlarda erişim, limit ve ceza ayarlanacaktır.`,
    ], [targetRow]);

    const panelMessage = question
        ? await question.edit(targetPanel)
        : await message.channel.send(targetPanel);
    const targetInteraction = await waitForComponent(panelMessage, message.author.id, ['wl:add:role', 'wl:add:user']);
    if (!targetInteraction) return showExpired(panelMessage, client);
    await targetInteraction.deferUpdate();

    const isRole = targetInteraction.customId === 'wl:add:role';
    const select = isRole
        ? new RoleSelectMenuBuilder().setCustomId('wl:add:target').setPlaceholder('Güvenli rol seç').setMaxValues(1)
        : new UserSelectMenuBuilder().setCustomId('wl:add:target').setPlaceholder('Güvenli kullanıcı seç').setMaxValues(1);

    await panelMessage.edit(createPanel([
        `${arrow} ${bold(isRole ? 'Rol Seçimi' : 'Kullanıcı Seçimi')}`,
        `${point} Güvenli listeye eklenecek ${isRole ? 'rolü' : 'kullanıcıyı'} aşağıdan seç.`,
    ], [new ActionRowBuilder().addComponents(select)]));

    const selection = await waitForComponent(panelMessage, message.author.id, ['wl:add:target']);
    if (!selection) return showExpired(panelMessage, client);
    await selection.deferUpdate();
    const value = selection.values[0];

    const typeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('wl:add:type').setPlaceholder('Erişim türünü seç').addOptions([
            { label: 'Full Erişim', description: 'Tüm güvenlik işlemlerine erişim', value: 'full' },
            { label: 'BlackList', description: 'Rol ve kanal blacklist işlemleri', value: 'blackList' },
            { label: 'Sunucu Güncellemeleri', value: 'guildUpdate' },
            { label: 'Üye Güncellemeleri', description: 'Ban, kick ve rol işlemleri', value: 'memberUpdate' },
            { label: 'Kanal İşlemleri', value: 'channel' },
            { label: 'Rol İşlemleri', value: 'role' },
            { label: 'Emoji ve Sticker', value: 'emoji' },
        ])
    );
    await panelMessage.edit(createPanel([
        `${arrow} ${bold('Erişim Türü')}`,
        `${point} Seçilen kayıt: <@${isRole ? '&' : ''}${value}>\n${point} İzin verilecek güvenlik işlemini seç.`,
    ], [typeRow]));

    const typeInteraction = await waitForComponent(panelMessage, message.author.id, ['wl:add:type']);
    if (!typeInteraction) return showExpired(panelMessage, client);
    await typeInteraction.deferUpdate();
    const type = typeInteraction.values[0];

    const limitRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('wl:add:limit').setPlaceholder('İşlem limitini seç').addOptions(
            ['1', '2', '3', '4', '5', '10', '15', '20', '25', '50', '100', '200', '500', '1000']
                .map((limit) => ({ label: `${limit} İşlem`, value: limit }))
        )
    );
    await panelMessage.edit(createPanel([
        `${arrow} ${bold('İşlem Limiti')}`,
        `${point} Erişim: ${inlineCode(whitelistTypeLabel(type))}\n${point} Günlük izin verilecek işlem sayısını seç.`,
    ], [limitRow]));

    const limitInteraction = await waitForComponent(panelMessage, message.author.id, ['wl:add:limit']);
    if (!limitInteraction) return showExpired(panelMessage, client);
    await limitInteraction.deferUpdate();
    const limit = limitInteraction.values[0];

    const punishRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('wl:add:punish').setPlaceholder('Limit aşımı cezasını seç').addOptions([
            { label: 'Yetkilerini Çek', value: 'pull' },
            { label: 'Sunucudan Yasakla', value: 'ban' },
            { label: 'Sunucudan At', value: 'kick' },
        ])
    );
    await panelMessage.edit(createPanel([
        `${arrow} ${bold('Limit Aşımı Cezası')}`,
        `${point} Günlük limit: ${inlineCode(limit)}\n${point} Limit aşıldığında uygulanacak cezayı seç.`,
    ], [punishRow]));

    const punishInteraction = await waitForComponent(panelMessage, message.author.id, ['wl:add:punish']);
    if (!punishInteraction) return showExpired(panelMessage, client);
    await punishInteraction.deferUpdate();
    const punish = punishInteraction.values[0];

    const document = await Settings.findOne({ guildID: message.guild.id });
    if (!document) return panelMessage.edit(createPanel([`${bold('İşlem Başarısız')}`, 'Güvenlik ayarları bulunamadı.']));
    if (!Array.isArray(document.whitelist)) document.whitelist = [];

    const existing = document.whitelist.find((item) => whitelistKey(item) === value);
    if (existing) {
        if (!Array.isArray(existing.access)) existing.access = whitelistAccess(existing);
        const oldAccess = existing.access.find((access) => access.type === type);
        if (oldAccess) {
            oldAccess.limit = limit;
            oldAccess.punish = punish;
        } else {
            existing.access.push({ type, limit, punish });
        }
    } else {
        document.whitelist.push({ key: value, access: [{ type, limit, punish }] });
    }

    await Settings.updateOne(
        { guildID: message.guild.id },
        { $set: { 'whitelist': document.whitelist } }
    );

    return panelMessage.edit(createPanel([
        `${check} ${bold(existing ? 'Güvenli Liste Güncellendi' : 'Güvenli Listeye Eklendi')}`,
        [
            `${point} Kayıt: <@${isRole ? '&' : ''}${value}>`,
            `${point} Erişim: ${inlineCode(whitelistTypeLabel(type))}`,
            `${point} Limit: ${inlineCode(limit)}`,
            `${point} Ceza: ${inlineCode(whitelistPunishLabel(punish))}`,
        ].join('\n'),
    ]));
}

async function removeWhitelist(client, message, question = null) {
    const { arrow, point, check, mark } = await getDesignEmojis(client);
    const targetRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl:remove:role').setLabel('Rol Çıkar').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('wl:remove:user').setLabel('Kullanıcı Çıkar').setStyle(ButtonStyle.Secondary),
    );
    const targetPanel = createPanel([
        `${arrow} ${bold('Güvenli Listeden Çıkar')}`,
        `${point} Güvenli listeden kaldırmak istediğin kayıt türünü seç.`,
    ], [targetRow]);

    const panelMessage = question
        ? await question.edit(targetPanel)
        : await message.channel.send(targetPanel);
    const targetInteraction = await waitForComponent(panelMessage, message.author.id, ['wl:remove:role', 'wl:remove:user']);
    if (!targetInteraction) return showExpired(panelMessage, client);
    await targetInteraction.deferUpdate();

    const isRole = targetInteraction.customId === 'wl:remove:role';
    const select = isRole
        ? new RoleSelectMenuBuilder().setCustomId('wl:remove:target').setPlaceholder('Çıkarılacak rolü seç').setMaxValues(1)
        : new UserSelectMenuBuilder().setCustomId('wl:remove:target').setPlaceholder('Çıkarılacak kullanıcıyı seç').setMaxValues(1);

    await panelMessage.edit(createPanel([
        `${arrow} ${bold(isRole ? 'Rol Seçimi' : 'Kullanıcı Seçimi')}`,
        `${point} Güvenli listeden tamamen kaldırılacak ${isRole ? 'rolü' : 'kullanıcıyı'} seç.`,
    ], [new ActionRowBuilder().addComponents(select)]));

    const selection = await waitForComponent(panelMessage, message.author.id, ['wl:remove:target']);
    if (!selection) return showExpired(panelMessage, client);
    await selection.deferUpdate();
    const value = selection.values[0];

    const document = await Settings.findOne({ guildID: message.guild.id });
    const whitelist = Array.isArray(document?.whitelist) ? document.whitelist : [];
    const existing = whitelist.some((item) => whitelistKey(item) === value);

    if (!existing) {
        return panelMessage.edit(createPanel([
            `${mark} ${bold('Kayıt Bulunamadı')}`,
            `${point} Seçilen ${isRole ? 'rol' : 'kullanıcı'} güvenli listede bulunmuyor.`,
        ]));
    }

    await Settings.updateOne(
        { guildID: message.guild.id },
        { $set: { 'whitelist': whitelist.filter((item) => whitelistKey(item) !== value) } }
    );

    return panelMessage.edit(createPanel([
        `${check} ${bold('Güvenli Listeden Çıkarıldı')}`,
        `${point} <@${isRole ? '&' : ''}${value}> güvenli listeden kaldırıldı.`,
    ]));
}

async function listWhitelist(client, message, question = null) {
    const document = await Settings.findOne({ guildID: message.guild.id });
    const whitelist = Array.isArray(document?.whitelist) ? document.whitelist : [];
    const { arrow, point, mark } = await getDesignEmojis(client);

    if (!whitelist.length) {
        const emptyPanel = createPanel([
            `${mark} ${bold('Güvenli Liste Boş')}`,
            `${point} Sunucuda kayıtlı güvenli kullanıcı veya rol bulunmuyor.`,
        ]);
        return question ? question.edit(emptyPanel) : message.channel.send(emptyPanel);
    }

    const entries = whitelist.map((item) => {
        const key = whitelistKey(item);
        const isRole = message.guild.roles.cache.has(key);
        const target = isRole ? `<@&${key}>` : `<@${key}>`;
        const access = whitelistAccess(item).map((data) => {
            const limit = Number(data.limit || 0) || 'Sınırsız';
            return `${point} ${inlineCode(whitelistTypeLabel(data.type))} • Limit: ${inlineCode(String(limit))} • Ceza: ${inlineCode(whitelistPunishLabel(data.punish))}`;
        }).join('\n');
        return `${bold(`${target} ${isRole ? '(Rol)' : '(Kullanıcı)'}`)}\n${access}`;
    });

    let page = 1;
    const perPage = 4;
    const totalPages = Math.ceil(entries.length / perPage);

    const render = (disabled = false) => {
        const start = (page - 1) * perPage;
        const rows = totalPages > 1 ? [getPageButtons(page, totalPages)] : [];
        return createPanel([
            `${arrow} ${bold('Güvenli Liste')}\n${point} Toplam ${inlineCode(String(entries.length))} kayıt görüntüleniyor.`,
            entries.slice(start, start + perPage).join('\n\n'),
            `${point} Sayfa ${inlineCode(`${page}/${totalPages}`)}`,
        ], rows, disabled);
    };

    const panelMessage = question
        ? await question.edit(render())
        : await message.channel.send(render());
    if (totalPages === 1) return panelMessage;

    const collector = panelMessage.createMessageComponentCollector({
        filter: (interaction) => interaction.customId.startsWith('wl:page:'),
        time: 60000,
    });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: 'Bu paneli sadece komutu kullanan kişi kullanabilir.', flags: 64 });
        }

        const action = interaction.customId.split(':')[2];
        if (action === 'first') page = 1;
        if (action === 'previous') page = Math.max(1, page - 1);
        if (action === 'next') page = Math.min(totalPages, page + 1);
        if (action === 'last') page = totalPages;
        await interaction.update(render());
    });

    collector.on('end', () => panelMessage.edit(render(true)).catch(() => null));
    return panelMessage;
}

function getPageButtons(page, total) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl:page:first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('wl:page:previous').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
        new ButtonBuilder().setCustomId('wl:page:count').setLabel(`${page}/${total}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('wl:page:next').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page === total),
        new ButtonBuilder().setCustomId('wl:page:last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(page === total),
    );
}
