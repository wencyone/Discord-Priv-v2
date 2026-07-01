const { EmbedBuilder } = require('discord.js');
const Punishment = require('../Schema/Punishment');

async function releaseJail(client, punishment, automatic = true, executorId = null) {
    const guild = client.guilds.cache.get(punishment.guildId);
    if (!guild) return false;

    const member = await guild.members.fetch(punishment.userId).catch(() => null);
    if (!member) return false;

    const roles = punishment.previousRoles.filter((roleId) => {
        const role = guild.roles.cache.get(roleId);
        return role && !role.managed && role.position < guild.members.me.roles.highest.position;
    });

    await member.roles.set(roles, automatic ? 'Jail süresi sona erdi.' : 'Jail yetkili tarafından kaldırıldı.');

    punishment.active = false;
    await punishment.save();

    const logChannel = guild.channels.cache.find((channel) => channel.name === 'jail-log');
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setTitle(automatic ? 'Jail Cezası Bitti' : 'Jail Yetkili Tarafından Kaldırıldı')
            .setColor(0x57f287)
            .addFields(
                { name: 'Kullanıcı', value: `<@${punishment.userId}> (\`${punishment.userId}\`)` },
                { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
                { name: 'İşlem', value: automatic ? 'Bu kişinin jail cezası bitti ve otomatik açıldı.' : 'Unjail komutu ile açıldı.', inline: true },
                ...(automatic ? [] : [{ name: 'Jaili Açan Yetkili', value: `<@${executorId}> (\`${executorId}\`)`, inline: true }])
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }

    return true;
}

function startJailScheduler(client) {
    if (client.jailScheduler) return;

    const checkExpiredJails = async () => {
        const punishments = await Punishment.find({ type: 'jail', active: true, expiresAt: { $lte: new Date() } }).catch(() => []);
        for (const punishment of punishments) {
            await releaseJail(client, punishment, true).catch((error) => console.error('[JAIL_RELEASE]', error));
        }
    };

    checkExpiredJails().catch((error) => console.error('[JAIL_SCHEDULER]', error));
    client.jailScheduler = setInterval(() => {
        checkExpiredJails().catch((error) => console.error('[JAIL_SCHEDULER]', error));
    }, 30000);
}

module.exports = { releaseJail, startJailScheduler };
