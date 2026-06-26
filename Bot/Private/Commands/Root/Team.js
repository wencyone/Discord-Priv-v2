const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    ModalBuilder,
    PermissionFlagsBits,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    codeBlock,
    roleMention,
} = require('discord.js');
const { createCanvas } = require('canvas');
const Settings = require('../../../Schema/Settings');

module.exports = {
    name: 'ekip',
    aliases: ['team'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!global.system.ownerID.includes(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici olmalısın.');
        }

        const teams = (wency.teams || []).filter((team) => message.guild.roles.cache.has(team.role));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create-team').setLabel('Ekip Oluştur').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('team-list').setLabel('Ekip Listesi').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('team-ranking').setLabel('Ekip Sıralama').setStyle(ButtonStyle.Primary),
        );

        const question = await message.channel.send({
            content: 'Aşağıdan yapmak istediğin işlemi seç.',
            components: [row],
        });

        const collector = question.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 1000 * 60 * 3,
            componentType: ComponentType.Button,
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'create-team') return createTeam(message, i, question, teams);
            if (i.customId === 'team-list') return listTeams(message, i, question, wency);
            if (i.customId === 'team-ranking') return rankTeams(message, i, question, wency);
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') question.edit({ components: [] }).catch(() => {});
        });
    },
};

async function createTeam(message, interaction, question, teams) {
    if (teams.length >= 25) {
        return interaction.reply({
            content: 'En fazla 25 ekip eklenebilir.',
            flags: 64,
        });
    }

    const modal = new ModalBuilder()
        .setCustomId('team-modal')
        .setTitle('Yeni Ekip Ekle')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Ekip Adı')
                    .setMinLength(2)
                    .setStyle(TextInputStyle.Short),
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('owners')
                    .setLabel('Ekip Sahipleri ID')
                    .setPlaceholder('123, 456')
                    .setStyle(TextInputStyle.Paragraph),
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('tags')
                    .setLabel('Ekip Tagları')
                    .setPlaceholder('tag1, tag2')
                    .setStyle(TextInputStyle.Paragraph),
            ),
        );

    await interaction.showModal(modal);

    const modalCollected = await interaction.awaitModalSubmit({
        filter: (m) => m.user.id === message.author.id,
        time: 1000 * 60 * 5,
    }).catch(() => null);

    if (!modalCollected) return;

    const teamName = modalCollected.fields.getTextInputValue('name').trim().toLowerCase();

    const teamTags = modalCollected.fields
        .getTextInputValue('tags')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

    const owners = modalCollected.fields
        .getTextInputValue('owners')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => message.guild.members.cache.has(id));

    if (!teamName || teams.some((team) => team.name === teamName)) {
        return modalCollected.reply({
            content: 'Bu isimde bir ekip zaten var.',
            flags: 64,
        }).catch(() => null);
    }

    if (!owners.length) {
        return modalCollected.reply({
            content: 'Geçerli ekip sahibi ID belirtmelisin.',
            flags: 64,
        }).catch(() => null);
    }

    if (teams.some((team) => team.tags?.some((tag) => teamTags.includes(tag)))) {
        return modalCollected.reply({
            content: 'Bu taglardan biri başka ekipte kullanılıyor.',
            flags: 64,
        }).catch(() => null);
    }

    const roleRow = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('team-role')
            .setPlaceholder('Ekip rolünü seç'),
    );

    await modalCollected.reply({
        content: `${titleCase(teamName)} ekibinin rolünü seç.`,
        components: [roleRow],
        flags: 64,
    });

    const roleMessage = await modalCollected.fetchReply();

    const roleCollected = await roleMessage.awaitMessageComponent({
        filter: (r) => r.user.id === message.author.id,
        time: 1000 * 60 * 3,
    }).catch(() => null);

    if (!roleCollected) return modalCollected.deleteReply().catch(() => {});

    const role = roleCollected.values[0];

    if (teams.some((team) => team.role === role)) {
        return roleCollected.reply({
            content: 'Bu role sahip bir ekip zaten var.',
            flags: 64,
        }).catch(() => null);
    }

    const nextTeams = [
        ...teams,
        {
            name: teamName,
            owners,
            role,
            tags: teamTags,
        },
    ];

    await Settings.updateOne(
        { id: message.guild.id },
        { $set: { teams: nextTeams } },
        { upsert: true },
    );

    await roleCollected.deferUpdate();
    await modalCollected.deleteReply().catch(() => {});

    return question.edit({
        content: `Başarıyla **${titleCase(teamName)}** (${roleMention(role)}) ekibi eklendi.`,
        components: [],
    });
}

async function listTeams(message, interaction, question, wency) {
    await interaction.deferUpdate();

    const members = message.guild.members.cache;

    const teams = (wency.teams || []).filter((team) => message.guild.roles.cache.has(team.role));

    if (!teams.length) {
        return question.edit({
            content: 'Sunucuda ekip bulunmuyor.',
            components: [],
        });
    }

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('team-select')
            .setPlaceholder(`Ekip seç (${teams.length})`)
            .addOptions(
                teams.slice(0, 25).map((team) => ({
                    label: `${titleCase(team.name)} (${members.filter((m) => m.roles.cache.has(team.role)).size} üye)`,
                    value: team.name,
                })),
            ),
    );

    await question.edit({
        content: 'Bakmak istediğin ekibi seç.',
        embeds: [],
        components: [selectRow],
    });

    const select = await question.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id,
        time: 1000 * 60 * 3,
    }).catch(() => null);

    if (!select) return question.edit({ components: [] }).catch(() => {});

    await select.deferUpdate();

    const team = teams.find((item) => item.name === select.values[0]);
    if (!team) {
        return question.edit({
            content: 'Ekip bulunamadı.',
            embeds: [],
            components: [],
        });
    }

    const teamMembers = members.filter((m) => m.roles.cache.has(team.role));

    const staffRoleIds = [
        ...(wency.auth || []),
        ...(wency.banAuth || []),
        ...(wency.timeOutAuth || []),
    ];

    const ownerAllowed =
        global.system.ownerID.includes(message.author.id) ||
        team.owners.includes(message.author.id);

    const deleteRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('team-remove')
            .setLabel('Ekip Sil')
            .setStyle(ButtonStyle.Danger),
    );

    const embed = teamEmbed(message, team, teamMembers, staffRoleIds);

    await question.edit({
        content: null,
        embeds: [embed],
        components: ownerAllowed ? [selectRow, deleteRow] : [selectRow],
    });

    if (!ownerAllowed) return;

    const remove = await question.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id && i.customId === 'team-remove',
        time: 1000 * 60 * 2,
    }).catch(() => null);

    if (!remove) return;

    await remove.reply({
        content: 'Ekip silindi.',
        flags: 64,
    });

    await Settings.updateOne(
        { id: message.guild.id },
        { $set: { teams: teams.filter((item) => item.name !== team.name) } },
        { upsert: true },
    );

    return question.edit({
        content: 'Ekip başarıyla silindi.',
        embeds: [],
        components: [],
    });
}

async function rankTeams(message, interaction, question, wency) {
    await interaction.deferUpdate();

    const members = message.guild.members.cache;

    const teams = (wency.teams || []).filter((team) => message.guild.roles.cache.has(team.role));

    if (!teams.length) {
        return question.edit({
            content: 'Sunucuda ekip bulunmuyor.',
            components: [],
        });
    }

    const staffRoleIds = [
        ...(wency.auth || []),
        ...(wency.banAuth || []),
        ...(wency.timeOutAuth || []),
    ];

    const stats = teams
        .map((team) => {
            const teamMembers = members.filter((m) => m.roles.cache.has(team.role));

            return {
                name: titleCase(team.name),
                total: teamMembers.size,
                tagged: teamMembers.filter((m) =>
                    team.tags?.some((tag) => m.displayName.toLowerCase().includes(tag)),
                ).size,
                staff: teamMembers.filter((m) =>
                    staffRoleIds.some((role) => m.roles.cache.has(role)),
                ).size,
                voice: teamMembers.filter((m) => m.voice.channelId).size,
            };
        })
        .sort((a, b) => b.voice - a.voice);

    const buffer = createChart(stats);

    const embed = new EmbedBuilder()
        .setTitle('Ekip Ses Aktivite Sıralaması')
        .setColor(0x2f3136)
        .setImage('attachment://teams.png')
        .setDescription(
            stats
                .map(
                    (team, index) =>
                        `\`${index + 1}.\` **${team.name}** - Seste: **${team.voice}**, Toplam: **${team.total}**, Taglı: **${team.tagged}**, Yetkili: **${team.staff}**`,
                )
                .join('\n'),
        );

    return question.edit({
        content: null,
        embeds: [embed],
        files: [new AttachmentBuilder(buffer, { name: 'teams.png' })],
        components: [],
    });
}

function teamEmbed(message, team, teamMembers, staffRoleIds) {
    const owners = team.owners
        .map((id) => message.guild.members.cache.get(id)?.user?.username || id)
        .join(', ');

    const tagged = teamMembers.filter((m) =>
        team.tags?.some((tag) => m.displayName.toLowerCase().includes(tag)),
    ).size;

    const staff = teamMembers.filter((m) =>
        staffRoleIds.some((role) => m.roles.cache.has(role)),
    ).size;

    const voice = teamMembers.filter((m) => m.voice.channelId).size;

    return new EmbedBuilder()
        .setColor(0x2f3136)
        .setDescription(
            codeBlock(
                'yaml',
                [
                    `# ${titleCase(team.name)}`,
                    `→ Kurucular: ${owners || 'Yok'}`,
                    `→ Rol: ${message.guild.roles.cache.get(team.role)?.name || team.role}`,
                    `→ Taglar: ${(team.tags || []).join(', ') || 'Yok'}`,
                    `→ Ekip Üye Sayısı: ${teamMembers.size}`,
                    `→ Taglı Üye Sayısı: ${tagged}`,
                    `→ Yetkili Sayısı: ${staff}`,
                    `→ Seste Olan Üye Sayısı: ${voice}`,
                ].join('\n'),
            ),
        );
}

function createChart(stats) {
    const width = 900;
    const height = 420;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Sans';
    ctx.fillText('Ekip Ses Aktivite Raporu', 36, 44);

    const max = Math.max(...stats.map((team) => team.voice), 1);
    const barWidth = Math.max(28, Math.floor(760 / Math.max(stats.length, 1)) - 14);
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#64748b'];

    stats.forEach((team, index) => {
        const x = 58 + index * (barWidth + 14);
        const barHeight = Math.max(6, Math.floor((team.voice / max) * 250));
        const y = 330 - barHeight;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 16px Sans';
        ctx.fillText(String(team.voice), x, y - 8);

        ctx.save();
        ctx.translate(x + 4, 362);
        ctx.rotate(-Math.PI / 5);
        ctx.font = '14px Sans';
        ctx.fillText(team.name.slice(0, 18), 0, 0);
        ctx.restore();
    });

    return canvas.toBuffer('image/png');
}

function titleCase(text) {
    return String(text || '')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}