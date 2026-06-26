const { Events } = require('discord.js');
const Settings = require('../../../Schema/Settings');

client.on(Events.GuildMemberAdd, async (member) => {

    const channel = member.guild.channels.cache.find(r => r.name === 'giriş-çıkış-log');
    if (channel) channel.send({ content: `<:success2_argenx:1515149838273220608> ${member} (${member.id}) sunucuya giriş yaptı.` }).catch(() => null);

    const document = await Settings.findOne({ id: member.guild.id });
    if (!document) return;

    if (document.welcomeChannel) {
        const welcomeChannel = member.guild.channels.cache.get(document.welcomeChannel);
        const registerInfoChannel = member.guild.channels.cache.find((channel) => channel.name === 'nasıl-kayıt-olurum' || channel.name === 'nasil-kayit-olurum');
        const registerInfoText = registerInfoChannel ? `${registerInfoChannel}` : '#nasıl-kayıt-olurum';

        if (welcomeChannel?.isTextBased()) {
            welcomeChannel.send({
                content: `Sunucumuza hoşgeldin ${member} ses gir kayıt ol kayıt olurken de ${registerInfoText} kanalını oku, Eğer tanıdığın biri varsa etiketle o kayıt eder.❤️`
            }).catch(() => null);
        }
    }

    if (document.mentionChannelIds?.length) {
        for (const channelId of document.mentionChannelIds) {
            const mentionChannel = member.guild.channels.cache.get(channelId);
            if (!mentionChannel?.isTextBased()) continue;
            mentionChannel.send({ content: `${member}` })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), 2000))
                .catch(() => {});
        }
    }

    if (document.autoRole) {
        await member.roles.add(document.registeredRole).catch(() => null);
    } else {
        await member.roles.add(document.unregisteredRole).catch(() => null);
    }
})
