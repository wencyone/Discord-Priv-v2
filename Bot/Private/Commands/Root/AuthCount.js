const { hasOwnerRole } = require('../../../Base/OwnerRole');
module.exports = {
    name: 'ysay',
    aliases: ['yetkilisay'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        const familyRoleIds = Array.isArray(wency.familyRole) ? wency.familyRole : (wency.familyRole ? [wency.familyRole] : []);
        const familyRoles = familyRoleIds.map((roleId) => message.guild?.roles.cache.get(roleId)).filter(Boolean);
        if (!familyRoles.length) return message.reply('Family rolü bulunamadı.');

        const members = await message.guild?.members.fetch();
        if (!members) return;

        const familyMembers = members.filter((m) => familyRoles.some((role) => m.roles.cache.has(role.id)));
        const notVoiceMembers = familyMembers.filter((m) => !m.user.bot && !m.voice.channelId);
        const dmMessage = `${message.guild.name} sunucusunda sese girmen isteniyor.`;

        await message.channel.send({
            content: [
                `Family rollerinde ${familyMembers.size} kişi bulunmakta.`,
                `Ses Kanalında Olmayanlar: ${notVoiceMembers.size} kişi`,
                `Sese geçin.`
            ].join('\n')
        });

        if (notVoiceMembers.size > 0) {
            const notVoiceArray = notVoiceMembers.map(member => `<@${member.id}>`);
            const chunks = [];

            for (let i = 0; i < notVoiceArray.length; i += 50) {
                chunks.push(notVoiceArray.slice(i, i + 50).join(', '));
            }

            for (const chunk of chunks) {
                await message.channel.send({ content: chunk });
            }

            for (const member of notVoiceMembers.values()) {
                await member.send({ content: dmMessage }).catch(() => null);
            }
        }
    }
}
