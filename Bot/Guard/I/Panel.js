const {
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} = require('discord.js');

async function emojis(client) {
    const get = async (name, fallback) => {
        if (typeof client.getEmoji !== 'function') return fallback;
        return await client.getEmoji(name).catch(() => null) || fallback;
    };

    return {
        arrow: await get('arrow', '›'),
        point: await get('point', '•'),
        check: await get('check', '✅'),
        mark: await get('mark', '❌'),
    };
}

function panel(sections, rows = [], disabled = false, ephemeral = false) {
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

    return {
        flags: ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2,
        components: [container],
    };
}

async function wait(message, userId, customIds, time = 60000) {
    return message.awaitMessageComponent({
        filter: (interaction) => interaction.user.id === userId && customIds.includes(interaction.customId),
        time,
    }).catch(() => null);
}

async function expired(message, client) {
    const { mark } = await emojis(client);
    return message.edit(panel([
        `${mark} **İşlem Süresi Doldu**`,
        'Panel kapatıldı. Komutu yeniden kullanabilirsin.',
    ])).catch(() => null);
}

module.exports = { emojis, panel, wait, expired };
