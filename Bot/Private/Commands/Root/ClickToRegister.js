const { hasOwnerRole } = require('../../../Base/OwnerRole');
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

module.exports = {
    name: 'kayıtpanel',
    aliases: ['kayitpanel'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;
        if (!wency.buttonRegister) return message.reply({ content: 'Butonlu kayıt sistemi kapalı. `.kur` menüsünden Butonlu Kayıt sistemini açmalısın.' });
        if (!wency.manRole || !wency.womanRole || !wency.registeredRole || !wency.unregisteredRole) {
            return message.reply({ content: 'Erkek, Kadın, Kayıtlı ve Kayıtsız rolleri `.kur` menüsünden ayarlanmalı.' });
        }

        return message.channel.send(createRegisterPanel(wency));
    }
};

function createRegisterPanel(wency) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('button-register:man')
            .setLabel(`Erkek (${wency.manClickCount || 0})`)
            .setEmoji('♂️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('button-register:woman')
            .setLabel(`Kadın (${wency.womanClickCount || 0})`)
            .setEmoji('♀️')
            .setStyle(ButtonStyle.Danger)
    );

    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent([
            '**Kayıt Paneli**',
            'Sunucumuza hoş geldiniz! Devam edebilmek için aşağıdaki adımları takip ederek kayıt olmanız gerekmektedir.',
        ].join('\n')))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Lütfen cinsiyetinizi seçerek kayıt işlemini tamamlayın. `Bu seçim daha sonra değiştirilebilir.`'))
        .addActionRowComponents(row)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Yanlış cinsiyet seçmeniz halinde cezalandırılacaksınız.'));

    return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [] },
    };
}
