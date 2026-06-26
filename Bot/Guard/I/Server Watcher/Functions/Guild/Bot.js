const { EmbedBuilder, codeBlock, UserFlags } = require('discord.js');
const { checkWhitelist, date } = require('../../../../Utils/Functions.js');

module.exports = async function botAdd(client, guild, audit, member) {
  const targetUser = audit?.target?.user || audit?.target;
  if (!targetUser?.id) return;

  const logChannel = guild.channels.cache.find((channel) => channel.name === 'guard-log')
    || client.users.cache.get(guild.ownerId);
  const safeMode = await checkWhitelist(client, member, 'full');

  if (!logChannel) return;

  await logChannel.send({
    embeds: [
      new EmbedBuilder({
        title: 'Bot Eklendi!',
        description: [
          codeBlock('yaml', [
            `→ İşlem Yapan Kişi: ${member?.user?.username || 'Bilinmiyor'} (${member?.id || 'Bilinmiyor'})`,
            `→ Güvenlik Durumu: ${safeMode ? 'Güvenli Listede' : 'Güvenli Değil'}`,
            `→ Eklenen Bot/Entegrasyon: ${targetUser.username || targetUser.tag || 'Bilinmiyor'} (${targetUser.id})`,
            `→ Ekleme Tarihi: ${date(Date.now())}`,
            `→ Whitelist Türü: ${safeMode?.whitelistType || 'Güvenli Değil'}`,
            `→ Limit Durumu: ${safeMode?.limitType || 'Limit Aşıldı'} [${safeMode?.limitRatio || 'Cezalandırıldı'}]`,
          ].join('\n')),
          codeBlock('yaml', [
            '# Bot Bilgileri',
            `→ İsmi: ${targetUser.username || targetUser.tag || 'Bilinmiyor'}`,
            `→ ID: ${targetUser.id}`,
            `→ Onaylı Mı: ${targetUser.flags?.has(UserFlags.VerifiedBot) ? 'Evet' : 'Hayır'}`,
          ].join('\n')),
        ].join('\n'),
      }),
    ],
  }).catch((error) => console.warn(`[GUARD LOG] Bot ekleme logu gönderilemedi: ${error.message}`));
};
