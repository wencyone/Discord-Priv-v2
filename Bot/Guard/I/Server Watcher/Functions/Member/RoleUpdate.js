const { EmbedBuilder, codeBlock } = require('discord.js');
const { checkWhitelist, date, checkRoles, syncRoleMemberBackup } = require('../../../../Utils/Functions.js');

module.exports = async function memberRoleUpdate(client, guild, audit, member, changes) {
  await syncRoleMemberBackup(guild, audit.targetId, changes);
  const disallowedRoles = await checkRoles(guild, changes.map(c => ({ key: c.key.replace('$', ''), data: c.new })));
  if (disallowedRoles.add.length === 0 && disallowedRoles.remove.length === 0) return;

  const logChannel = guild.channels.cache.find(c => c.name === 'guard-log') || client.users.cache.get(guild.ownerId);
  const safeMode = await checkWhitelist(client, member, 'memberUpdate');

  if (logChannel) logChannel.send({
    embeds: [
      new EmbedBuilder({
        title: 'Bir Üyenin Rolleri Güncellendi!',
        description: [
          codeBlock('yaml', [
            `→ İşlem Yapan Kişi: ${audit.executor.username} (${audit.executor.id})`,
            `→ Güvenlik Durumu: ${safeMode ? '🟢 Güvenli Listede' : '🔴 Güvenli Değil'}`,
            `→ İşlem Tarihi: ${date(Date.now())}`,
            `→ Güvenlik Durumu: ${safeMode?.whitelistType || 'Güvenli Değil'}`,
            `→ Limit Durumu: ${safeMode?.limitType || 'Limit Aşıldı'} [${safeMode?.limitRatio || 'Cezalandırıldı'}]`,
          ].join('\n')),
          codeBlock('ansi', [
            '[2;37m→ Rolleri Güncellenen Üye: [0m [2;31m' + member.user.username + ' (' + member.id + ')[0m',
            `[2;37m[+] Eklenen Roller: [0m [2;31m\n${disallowedRoles.add.map(r => `→ @${r.name} (${r.id})`).join('\n') || 'Yok'}[0m`,
            `[2;37m[-] Kaldırılan Roller: [0m [2;31m\n${disallowedRoles.remove.map(r => `→ @${r.name} (${r.id})`).join('\n') || 'Yok'}[0m`,
          ].join('\n')),
        ].join('\n'),
      })
    ]
  })
};
