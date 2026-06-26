const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const Giveaway = require('../Schema/Giveaway');

const CHECK_INTERVAL = 15_000;

function giveawayButton(id, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`giveaway_join:${id}`)
            .setEmoji('📢')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
}

function giveawayEmbed(giveaway, ended = false) {
    const endsAt = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
    const participants = giveaway.participants?.length || 0;
    const winners = giveaway.winners || [];

    const embed = new EmbedBuilder()
        .setTitle(giveaway.prize)
        .setDescription(
            ended
                ? `**Çekiliş sona erdi**\n<t:${endsAt}:F>`
                : `**Bitiş**\n<t:${endsAt}:R> (<t:${endsAt}:F>)`
        )
        .addFields(
            { name: 'Başlatan', value: `<@${giveaway.hostId}>`, inline: true },
            { name: 'Katılımcı', value: String(participants), inline: true },
            { name: 'Kazanan sayısı', value: String(giveaway.winnerCount), inline: true }
        );

    if (giveaway.predeterminedDisclosed && !ended) {
        embed.addFields({
            name: 'Cekiliş Detayı',
            value: 'Cekilis Kazanani Baslatan Kisiyle Irtibaya Gecebilir!'
        });
    }

    if (ended) {
        embed.addFields({
            name: 'Kazanan',
            value: winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'Geçerli katılımcı bulunamadı.'
        });
    }

    return embed;
}

function randomWinners(participants, count) {
    const pool = [...new Set(participants)];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.max(1, count));
}

async function createGiveawayMessage(channel, giveaway) {
    const message = await channel.send({
        embeds: [giveawayEmbed(giveaway)],
        components: [giveawayButton(giveaway._id.toString())]
    });

    giveaway.messageId = message.id;
    giveaway.status = 'active';
    await giveaway.save();
    return message;
}

async function handleGiveawayButton(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('giveaway_join:')) return false;

    const giveawayId = interaction.customId.slice('giveaway_join:'.length);
    let giveaway = await Giveaway.findOne({
        _id: giveawayId,
        guildId: interaction.guildId,
        status: 'active'
    });

    if (!giveaway || new Date(giveaway.endsAt).getTime() <= Date.now()) {
        await interaction.reply({ content: 'Bu çekiliş sona ermiş.', flags: 64 }).catch(() => null);
        return true;
    }

    const alreadyJoined = giveaway.participants.includes(interaction.user.id);
    giveaway = await Giveaway.findByIdAndUpdate(
        giveaway._id,
        alreadyJoined
            ? { $pull: { participants: interaction.user.id } }
            : { $addToSet: { participants: interaction.user.id } },
        { new: true }
    );

    await interaction.update({
        embeds: [giveawayEmbed(giveaway)],
        components: [giveawayButton(giveaway._id.toString())]
    }).catch(async () => {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Katılım bilgisi güncellenemedi.', flags: 64 }).catch(() => null);
        }
    });

    await interaction.followUp({
        content: alreadyJoined ? 'Çekilişten ayrıldın.' : 'Çekilişe katıldın.',
        flags: 64
    }).catch(() => null);
    return true;
}

async function finishGiveaway(client, giveawayId) {
    const giveaway = await Giveaway.findOneAndUpdate(
        { _id: giveawayId, status: 'active' },
        { $set: { status: 'ending' } },
        { new: true }
    );
    if (!giveaway) return;

    try {
        const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
        const channel = guild?.channels.cache.get(giveaway.channelId) || await guild?.channels.fetch(giveaway.channelId).catch(() => null);

        let winners = [];
        if (giveaway.predeterminedWinnerId) {
            winners = [giveaway.predeterminedWinnerId];
        } else {
            const eligible = [];
            for (const userId of giveaway.participants) {
                const member = guild?.members.cache.get(userId) || await guild?.members.fetch(userId).catch(() => null);
                if (member && !member.user.bot) eligible.push(userId);
            }
            winners = randomWinners(eligible, giveaway.winnerCount);
        }

        giveaway.winners = winners;
        giveaway.status = 'ended';
        await giveaway.save();

        const message = channel?.messages
            ? await channel.messages.fetch(giveaway.messageId).catch(() => null)
            : null;
        await message?.edit({
            embeds: [giveawayEmbed(giveaway, true)],
            components: []
        }).catch(() => null);

        if (!channel) return;
        if (!winners.length) {
            await channel.send({ content: `**${giveaway.prize}** çekilişi sona erdi fakat geçerli katılımcı bulunamadı.` }).catch(() => null);
            return;
        }

        const mentions = winners.map((id) => `<@${id}>`).join(', ');
        await channel.send({
            content: `Tebrikler ${mentions}! **${giveaway.prize}** çekilişini kazandınız.`,
            allowedMentions: { users: winners }
        }).catch(() => null);

        for (const userId of winners) {
            const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
            await user?.send({
                content: `Tebrikler! **${guild?.name || 'Sunucu'}** sunucusundaki **${giveaway.prize}** çekilişini kazandın.`,
                allowedMentions: { parse: [] }
            }).catch(() => null);
        }
    } catch (error) {
        console.error('[GIVEAWAY_FINISH]', error);
        await Giveaway.updateOne({ _id: giveawayId, status: 'ending' }, { $set: { status: 'active' } }).catch(() => null);
    }
}

async function checkGiveaways(client) {
    const giveaways = await Giveaway.find({ status: 'active', endsAt: { $lte: new Date() } }).select('_id').lean();
    for (const giveaway of giveaways) {
        await finishGiveaway(client, giveaway._id);
    }
}

function startGiveawayScheduler(client) {
    if (client.giveawayScheduler) return;
    checkGiveaways(client).catch((error) => console.error('[GIVEAWAY_CHECK]', error));
    client.giveawayScheduler = setInterval(() => {
        checkGiveaways(client).catch((error) => console.error('[GIVEAWAY_CHECK]', error));
    }, CHECK_INTERVAL);
}

module.exports = {
    createGiveawayMessage,
    giveawayEmbed,
    handleGiveawayButton,
    startGiveawayScheduler
};
