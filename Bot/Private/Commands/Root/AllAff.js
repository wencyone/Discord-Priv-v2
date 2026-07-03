const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} = require('discord.js');
const Punishment = require('../../../Schema/Punishment');
const { releaseJail } = require('../../../Base/Jail');

function createPanel(customIds, state, disabled = false) {
    const statusLabels = {
        waiting: 'Bekliyor',
        running: 'İşleniyor...',
        completed: 'Tamamlandı',
        failed: 'Hata oluştu',
    };
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(customIds.jail)
            .setLabel('Jail Af')
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || state.jail.status !== 'waiting'),
        new ButtonBuilder()
            .setCustomId(customIds.ban)
            .setLabel('Ban Af')
            .setEmoji('🔨')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || state.ban.status !== 'waiting'),
    );

    return new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent([
            '# 🕊️ Toplu Af Yönetimi',
            'Uygulamak istediğin af türünü aşağıdaki butonlardan seç.',
            'İki af türünü de uygulamak için iki butona ayrı ayrı basabilirsin.',
        ].join('\n')))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent([
            `🔓 **Jail Af:** ${statusLabels[state.jail.status]}${state.jail.result ? ` — ${state.jail.result}` : ''}`,
            `🔨 **Ban Af:** ${statusLabels[state.ban.status]}${state.ban.result ? ` — ${state.ban.result}` : ''}`,
        ].join('\n')))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(row);
}

async function pardonBans(message) {
    const bans = await message.guild.bans.fetch();
    let removed = 0;
    let failed = 0;

    for (const ban of bans.values()) {
        try {
            await message.guild.members.unban(ban.user.id, `Toplu af | Yetkili: ${message.author.tag} (${message.author.id})`);
            await Punishment.updateMany(
                { guildId: message.guild.id, userId: ban.user.id, type: 'ban', active: true },
                { $set: { active: false } }
            );
            removed++;
        } catch (error) {
            failed++;
            console.error(`[ALL_AFF_UNBAN] ${ban.user.id}:`, error);
        }
    }

    return failed
        ? `Toplam ${removed} kişinin banı açıldı, ${failed} işlem başarısız.`
        : `Toplam ${removed} kişinin banı açıldı.`;
}

async function pardonJails(client, message) {
    const activeJails = await Punishment.find({ guildId: message.guild.id, type: 'jail', active: true });
    let removed = 0;
    let failed = 0;

    for (const punishment of activeJails) {
        try {
            const member = await message.guild.members.fetch(punishment.userId).catch(() => null);
            if (member) {
                const released = await releaseJail(client, punishment, false, message.author.id);
                if (!released) throw new Error('Jail kaldırma işlemi tamamlanamadı.');
            } else {
                punishment.active = false;
                await punishment.save();
            }
            removed++;
        } catch (error) {
            failed++;
            console.error(`[ALL_AFF_UNJAIL] ${punishment.userId}:`, error);
        }
    }

    return failed
        ? `Toplam ${removed} kişinin jaili açıldı, ${failed} işlem başarısız.`
        : `Toplam ${removed} kişinin jaili açıldı.`;
}

module.exports = {
    name: 'allaff',
    aliases: ['af', 'allaf'],
    category: 'Root',

    execute: async (client, message) => {
        if (!global.system.ownerID.includes(message.author.id)) return;

        const customIds = {
            jail: `allaff:jail:${message.author.id}`,
            ban: `allaff:ban:${message.author.id}`,
        };
        const state = {
            jail: { status: 'waiting', result: '' },
            ban: { status: 'waiting', result: '' },
        };
        const panelMessage = await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [createPanel(customIds, state)],
        });
        const collector = panelMessage.createMessageComponentCollector({ time: 5 * 60 * 1000 });

        collector.on('collect', async (interaction) => {
            if (!Object.values(customIds).includes(interaction.customId)) return;
            if (interaction.user.id !== message.author.id || !global.system.ownerID.includes(interaction.user.id)) {
                return interaction.reply({ content: 'Bu paneli sadece komutu kullanan bot sahibi kullanabilir.', flags: MessageFlags.Ephemeral });
            }

            const type = interaction.customId === customIds.jail ? 'jail' : 'ban';
            if (state[type].status !== 'waiting') return interaction.deferUpdate();

            state[type].status = 'running';
            await interaction.update({ components: [createPanel(customIds, state)] });

            try {
                state[type].result = type === 'jail'
                    ? await pardonJails(client, message)
                    : await pardonBans(message);
                state[type].status = 'completed';
            } catch (error) {
                state[type].status = 'failed';
                state[type].result = 'Af işlemi tamamlanamadı.';
                console.error(`[ALL_AFF_${type.toUpperCase()}]`, error);
            }

            await panelMessage.edit({ components: [createPanel(customIds, state)] }).catch(() => null);
            if (state.jail.status !== 'waiting' && state.ban.status !== 'waiting') collector.stop('completed');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'completed') return;
            await panelMessage.edit({ components: [createPanel(customIds, state, true)] }).catch(() => null);
        });
    }
};
