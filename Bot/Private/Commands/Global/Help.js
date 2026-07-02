const {
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags,
    PermissionsBitField,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} = require('discord.js');

const categories = {
    General: { label: 'Kullanıcı Komutları', description: 'Genel kullanıcı komutlarını gösterir.', emoji: '👤' },
    Auth: { label: 'Yetkili Komutları', description: 'Yetkili ve yönetim komutlarını gösterir.', emoji: '🛡️' },
    Economy: { label: 'Ekonomi Komutları', description: 'Ekonomi komutlarını gösterir.', emoji: '💰' },
    Fun: { label: 'Eğlence Komutları', description: 'Eğlence komutlarını gösterir.', emoji: '🎮' },
    Stat: { label: 'İstatistik Komutları', description: 'Sunucu istatistik komutlarını gösterir.', emoji: '📊' },
    Root: { label: 'Kurucu Komutları', description: 'Kurucu ve sistem komutlarını gösterir.', emoji: '⚙️' },
};

function createMenu(customId, selected, disabled = false) {
    return new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Bir komut kategorisi seçin...')
        .setDisabled(disabled)
        .addOptions(Object.entries(categories).map(([value, category]) => ({
            label: category.label,
            description: category.description,
            emoji: category.emoji,
            value,
            default: value === selected,
        })));
}

function createPanel(client, customId, selected, disabled = false) {
    const category = selected ? categories[selected] : null;
    const commands = selected ? client.commands.filter((command) => command.category === selected) : null;
    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent([
            `# 📚 ${client.user.username} Komut Menüsü`,
            `Sunucuda kullanabileceğiniz toplam **${client.commands.size}** komut bulunuyor.`,
            'Detaylarını görmek istediğiniz kategoriyi aşağıdaki menüden seçin.',
        ].join('\n')))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    if (category) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                `## ${category.emoji} ${category.label}`,
                commands.size
                    ? commands.map((command) => `\`.${command.name}\``).join('  ')
                    : 'Bu kategoride görüntülenecek komut bulunmuyor.',
                `-# Bu kategoride ${commands.size} komut bulunuyor.`,
            ].join('\n')))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    } else {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Bir komutun ayrıntısını doğrudan görmek için `.help <komut>` kullanabilirsiniz.'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    }

    return container.addActionRowComponents(new ActionRowBuilder().addComponents(createMenu(customId, selected, disabled)));
}

module.exports = {
    name: 'yardım',
    aliases: ['help', 'yardim', 'komutlar'],
    category: 'General',

    execute: async (client, message, args, wency) => {
        const channel = message.guild.channels.cache.get(wency.botCommandChannel);
        if (message.channel.name !== channel?.name && !message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply({ content: `Bu komut sadece ${channel} kanalında kullanılabilir.` });

        const query = args[0]?.toLocaleLowerCase('tr-TR');
        const command = query
            ? client.commands.get(query) || client.commands.find((item) => item.aliases?.includes(query))
            : null;

        if (command) {
            const aliases = command.aliases?.length ? command.aliases.map((alias) => `\`.${alias}\``).join(', ') : 'Bulunmuyor';
            const container = new ContainerBuilder()
                .setAccentColor(0x5865f2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                    '# 📖 Komut Bilgisi',
                    `**Komut:** \`.${command.name}\``,
                    `**Alternatifler:** ${aliases}`,
                    `**Kategori:** ${categories[command.category]?.label || command.category}`,
                ].join('\n')));

            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

        const customId = `help-category:${message.author.id}`;
        const question = await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [createPanel(client, customId)],
        });
        const collector = question.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === message.author.id && interaction.customId === customId,
            time: 60000,
        });

        collector.on('collect', async (interaction) => {
            const selected = interaction.values[0];
            await interaction.update({ components: [createPanel(client, customId, selected)] });
        });

        collector.on('end', async () => {
            await question.edit({ components: [createPanel(client, customId, null, true)] }).catch(() => null);
        });
    }
};
