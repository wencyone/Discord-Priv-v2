const {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

function createMemberLog(member, joined) {
    const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
    const eventTimestamp = Math.floor(Date.now() / 1000);
    const title = joined ? 'Giren Üye' : 'Çıkan Üye';
    const container = new ContainerBuilder()
        .setAccentColor(joined ? 0x45c486 : 0xed4245)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent([
                        `# ${joined ? '🟢' : '🔴'} ${title}`,
                        `${member} ${member.user.username}`,
                        '',
                        '## Hesap Yaşı',
                        `<t:${createdTimestamp}:R>`,
                        '',
                        `**ID:** ${member.id} • <t:${eventTimestamp}:F>`,
                    ].join('\n'))
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ extension: 'png', size: 1024 }))
                )
        );

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [] },
    };
}

module.exports = { createMemberLog };
