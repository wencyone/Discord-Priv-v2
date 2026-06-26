const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const CanvasUtil = require('../../../Base/CanvasUtil');

module.exports = {
    name: 'ship',
    aliases: ['shiple'],
    category: 'Fun',

    execute: async (client, message, args, wency) => {
        if (!message.guild || !message.member) return;

        let user1 = message.author;
        let user2;

        if (message.mentions.users.size >= 2) {
            const users = message.mentions.users.toJSON();
            user1 = users[0];
            user2 = users[1];
        } else if (message.mentions.users.size === 1) {
            user2 = message.mentions.users.first();
        } else {
            const manRole = wency?.manRole;
            const womanRole = wency?.womanRole;
            const isMan = manRole && message.member.roles.cache.has(manRole);
            const isWoman = womanRole && message.member.roles.cache.has(womanRole);
            let pool = message.guild.members.cache.filter((m) => !m.user.bot && m.id !== message.author.id);
            if (isMan && womanRole) pool = pool.filter((m) => m.roles.cache.has(womanRole));
            if (isWoman && manRole) pool = pool.filter((m) => m.roles.cache.has(manRole));
            user2 = pool.random()?.user;
        }

        if (!user2) return message.reply('Shiplenecek uygun bir üye bulunamadı.');

        const percent = Math.floor(Math.random() * 96) + 5;
        const buffer = await CanvasUtil.shipCard(user1, user2, percent);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ship_tanis').setLabel('Tanış').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ship_ozel_tanis').setLabel('Özel Tanış').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ship_sarki').setLabel('Sizin Şarkınız').setStyle(ButtonStyle.Secondary),
        );
        const showButtons = percent >= 80;

        const shipMsg = await message.reply({
            content: `**${user1.username}** ve **${user2.username}** arasındaki sevgi uyumu: **%${percent}**\n${createContent(percent)}`,
            files: [new AttachmentBuilder(buffer, { name: 'ship.png' })],
            components: showButtons ? [row] : [],
        });

        if (!showButtons) return;

        const collector = shipMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5 * 60 * 1000 });
        collector.on('collect', async (i) => {
            if (i.customId === 'ship_tanis') {
                return i.reply({
                    content: `${user1} ${user2}\nYıldızlarınız iyi görünüyor. Güzel bir sohbet başlatmanın tam zamanı.`,
                    allowedMentions: { users: [user1.id, user2.id] },
                }).catch(() => null);
            }

            if (i.customId === 'ship_ozel_tanis') {
                if (i.user.id !== user1.id) return i.reply({ content: 'Bu butonu sadece shipi başlatan kişi kullanabilir.', flags: 64 }).catch(() => null);
                await i.deferReply({ flags: 64 });
                try {
                    const meetBuffer = await CanvasUtil.shipMeetCard(user1, message.guild.name);
                    await user2.send({
                        content: `Selam. ${user1} seni ${message.guild.name} sunucusunda shipledi ve seninle tanışmak istiyor.`,
                        files: [new AttachmentBuilder(meetBuffer, { name: 'meet-invitation.png' })],
                    });
                    return i.editReply({ content: 'Tanışma isteği DM üzerinden gönderildi.' }).catch(() => null);
                } catch {
                    return i.editReply({ content: 'Kullanıcının DM kutusu kapalı olduğu için istek gönderilemedi.' }).catch(() => null);
                }
            }

            if (i.customId === 'ship_sarki') {
                const songs = [
                    { title: 'Sezen Aksu - Kaçın Kurası', url: 'https://www.youtube.com/results?search_query=Sezen+Aksu+Ka%C3%A7%C4%B1n+Kuras%C4%B1' },
                    { title: 'Sezen Aksu - Tükeneceğiz', url: 'https://www.youtube.com/results?search_query=Sezen+Aksu+T%C3%BCkenece%C4%9Fiz' },
                    { title: 'Sezen Aksu - Git', url: 'https://www.youtube.com/results?search_query=Sezen+Aksu+Git' },
                    { title: 'Tarkan - Beni Çok Sev', url: 'https://www.youtube.com/results?search_query=Tarkan+Beni+%C3%87ok+Sev' },
                    { title: 'Tarkan - Kuzu Kuzu', url: 'https://www.youtube.com/results?search_query=Tarkan+Kuzu+Kuzu' },
                    { title: 'Yalın - Meleklerin Sözü Var', url: 'https://www.youtube.com/results?search_query=Yal%C4%B1n+Meleklerin+S%C3%B6z%C3%BC+Var' },
                    { title: 'Yalın - Ki Sen', url: 'https://www.youtube.com/results?search_query=Yal%C4%B1n+Ki+Sen' },
                    { title: 'Yalın - Benimki', url: 'https://www.youtube.com/results?search_query=Yal%C4%B1n+Benimki' },
                    { title: 'Kenan Doğulu - Aşk ile Yap', url: 'https://www.youtube.com/results?search_query=Kenan+Do%C4%9Fulu+A%C5%9Fk+ile+Yap' },
                    { title: 'Kenan Doğulu - Tutamıyorum Zamanı', url: 'https://www.youtube.com/results?search_query=Kenan+Do%C4%9Fulu+Tutam%C4%B1yorum+Zaman%C4%B1' },
                    { title: 'Mabel Matiz - Antidepresan', url: 'https://www.youtube.com/results?search_query=Mabel+Matiz+Antidepresan' },
                    { title: 'Mabel Matiz - Öyle Kolaysa', url: 'https://www.youtube.com/results?search_query=Mabel+Matiz+%C3%96yle+Kolaysa' },
                    { title: 'Mabel Matiz - Gel', url: 'https://www.youtube.com/results?search_query=Mabel+Matiz+Gel' },
                    { title: 'Duman - Senden Daha Güzel', url: 'https://www.youtube.com/results?search_query=Duman+Senden+Daha+G%C3%BCzel' },
                    { title: 'Duman - Her Şeyi Yak', url: 'https://www.youtube.com/results?search_query=Duman+Her+%C5%9Eeyi+Yak' },
                    { title: 'Teoman - Papatya', url: 'https://www.youtube.com/results?search_query=Teoman+Papatya' },
                    { title: 'Teoman - Bana Öyle Bakma', url: 'https://www.youtube.com/results?search_query=Teoman+Bana+%C3%96yle+Bakma' },
                    { title: 'Mor ve Ötesi - Bir Derdim Var', url: 'https://www.youtube.com/results?search_query=Mor+ve+%C3%96tesi+Bir+Derdim+Var' },
                    { title: 'MFÖ - Ele Güne Karşı', url: 'https://www.youtube.com/results?search_query=MF%C3%96+Ele+G%C3%BCne+Kar%C5%9F%C4%B1' },
                    { title: 'Barış Manço - Gülpembe', url: 'https://www.youtube.com/results?search_query=Bar%C4%B1%C5%9F+Man%C3%A7o+G%C3%BClpembe' },
                    { title: 'Nil Karaibrahimgil - Seviyorum Sevmiyorum', url: 'https://www.youtube.com/results?search_query=Nil+Karaibrahimgil+Seviyorum+Sevmiyorum' },
                    { title: 'Göksel - Uzaktan', url: 'https://www.youtube.com/results?search_query=G%C3%B6ksel+Uzaktan' },
                    { title: 'Göksel - Aşkın Yalanmış', url: 'https://www.youtube.com/results?search_query=G%C3%B6ksel+A%C5%9Fk%C4%B1n+Yalanm%C4%B1%C5%9F' },
                    { title: 'Sıla - Yoruldum', url: 'https://www.youtube.com/results?search_query=S%C4%B1la+Yoruldum' },
                    { title: 'Sıla - Kafa', url: 'https://www.youtube.com/results?search_query=S%C4%B1la+Kafa' },
                    { title: 'Bengü - Aşkım', url: 'https://www.youtube.com/results?search_query=Beng%C3%BC+A%C5%9Fk%C4%B1m' },
                    { title: 'Hande Yener - Kırmızı', url: 'https://www.youtube.com/results?search_query=Hande+Yener+K%C4%B1rm%C4%B1z%C4%B1' },
                    { title: 'Gülşen - Bangır Bangır', url: 'https://www.youtube.com/results?search_query=G%C3%BCl%C5%9Fen+Bang%C4%B1r+Bang%C4%B1r' },
                    { title: 'Hadise - Düm Tek Tek', url: 'https://www.youtube.com/results?search_query=Hadise+D%C3%BCm+Tek+Tek' },
                    { title: 'Emre Aydın - Belki Bir Gün Özlersin', url: 'https://www.youtube.com/results?search_query=Emre+Ayd%C4%B1n+Belki+Bir+G%C3%BCn+%C3%96zlersin' },
                    { title: 'Emre Aydın - Hoşçakal', url: 'https://www.youtube.com/results?search_query=Emre+Ayd%C4%B1n+Ho%C5%9F%C3%A7akal' },
                    { title: 'Gripin - Aşk Nereden Nereye', url: 'https://www.youtube.com/results?search_query=Gripin+A%C5%9Fk+Nereden+Nereye' },
                    { title: 'Model - Değmesin Ellerimiz', url: 'https://www.youtube.com/results?search_query=Model+De%C4%9Fmesin+Ellerimiz' },
                    { title: 'Pinhani - Beni Sen İnandır', url: 'https://www.youtube.com/results?search_query=Pinhani+Beni+Sen+%C4%B0nand%C4%B1r' },
                    { title: 'Pinhani - Dünyadan Uzak', url: 'https://www.youtube.com/results?search_query=Pinhani+D%C3%BCnyadan+Uzak' },
                    { title: 'Yüzyüzeyken Konuşuruz - Dinle Beni Bi', url: 'https://www.youtube.com/results?search_query=Y%C3%BCzy%C3%BCzeyken+Konu%C5%9Furuz+Dinle+Beni+Bi' },
                    { title: 'Adamlar - Koca Yaşlı Şişko Dünya', url: 'https://www.youtube.com/results?search_query=Adamlar+Koca+Ya%C5%9Fl%C4%B1+%C5%9Ei%C5%9Fko+D%C3%BCnya' },
                    { title: 'Büyük Ev Ablukada - En Güzel Yerinde Evin', url: 'https://www.youtube.com/results?search_query=B%C3%BCy%C3%BCk+Ev+Ablukada+En+G%C3%BCzel+Yerinde+Evin' },
                    { title: 'Cem Adrian - Sen Benim Şarkılarımsın', url: 'https://www.youtube.com/results?search_query=Cem+Adrian+Sen+Benim+%C5%9Eark%C4%B1lar%C4%B1ms%C4%B1n' },
                    { title: 'Cem Adrian - Beni Hatırla', url: 'https://www.youtube.com/results?search_query=Cem+Adrian+Beni+Hat%C4%B1rla' },
                    { title: 'Zakkum - Anason', url: 'https://www.youtube.com/results?search_query=Zakkum+Anason' },
                    { title: 'Seksendört - Kendime Yalan Söyledim', url: 'https://www.youtube.com/results?search_query=Seksend%C3%B6rt+Kendime+Yalan+S%C3%B6yledim' },
                    { title: 'Athena - Arsız Gönül', url: 'https://www.youtube.com/results?search_query=Athena+Ars%C4%B1z+G%C3%B6n%C3%BCl' },
                    { title: 'Ed Sheeran - Perfect', url: 'https://www.youtube.com/results?search_query=Ed+Sheeran+Perfect' },
                    { title: 'Ed Sheeran - Thinking Out Loud', url: 'https://www.youtube.com/results?search_query=Ed+Sheeran+Thinking+Out+Loud' },
                    { title: 'John Legend - All of Me', url: 'https://www.youtube.com/results?search_query=John+Legend+All+of+Me' },
                    { title: 'Adele - Make You Feel My Love', url: 'https://www.youtube.com/results?search_query=Adele+Make+You+Feel+My+Love' },
                    { title: 'Bruno Mars - Just The Way You Are', url: 'https://www.youtube.com/results?search_query=Bruno+Mars+Just+The+Way+You+Are' },
                    { title: 'Taylor Swift - Lover', url: 'https://www.youtube.com/results?search_query=Taylor+Swift+Lover' },
                    { title: 'Arctic Monkeys - I Wanna Be Yours', url: 'https://www.youtube.com/results?search_query=Arctic+Monkeys+I+Wanna+Be+Yours' },
                ];
                const song = songs[Math.floor(Math.random() * songs.length)];
                const embed = new EmbedBuilder()
                    .setColor('#d4af37')
                    .setTitle('Sizin Şarkınız Belirlendi')
                    .setDescription(`Bu anı şu şarkıyla taşıyalım:\n\n**[${song.title}](${song.url})**`)
                    .setThumbnail(user1.displayAvatarURL({ extension: 'png', size: 256 }))
                    .setTimestamp();
                return i.reply({ embeds: [embed] }).catch(() => null);
            }
        });

        collector.on('end', () => shipMsg.edit({ components: [] }).catch(() => {}));
    },
};

function createContent(num) {
    if (num < 5) return 'Bu hikaye başlamadan bitmiş gibi...';
    if (num < 10) return 'Aynı odada bile yabancı kalırsınız.';
    if (num < 15) return 'Arada kıvılcım değil, bildirim sesi bile yok.';
    if (num < 20) return 'Kalpler farklı sunucularda takılıyor.';
    if (num < 25) return 'Bir selam verilir ama devamı zor gelir.'; 
    if (num < 30) return 'Ufak bir merak var, aşk demek erken.';
    if (num < 35) return 'Sohbet döner ama kalp hâlâ beklemede.';
    if (num < 40) return 'Biraz elektrik var, sigorta kaldırır mı bilinmez.';
    if (num < 45) return 'Tatlı bir ihtimal var, üstüne gidilirse parlar.';
    if (num < 50) return 'Arkadaşlıktan aşk doğar mı sorusu burada başlıyor.';
    if (num < 55) return 'Kalp yarı yarıya ikna olmuş gibi.';
    if (num < 60) return 'Güzel bir sohbet bu oranı yukarı taşır.';
    if (num < 65) return 'Ufaktan bir bakışma enerjisi geldi.';
    if (num < 70) return 'Bu iş kahve bahanesiyle yürür.';
    if (num < 75) return 'Tatlı bir çift havası var, inkâr etmeyin.';
    if (num < 80) return 'Biraz cesaretle güzel şeyler olabilir.';
    if (num < 85) return 'Bu uyum tesadüf değil, mesaj atılır.';
    if (num < 90) return 'Kalpler aynı şarkının nakaratına girmiş.';
    if (num < 95) return 'Bu ship tuttu, nazar boncuğu takın.';
    return 'Ev boş demeden önce nikâh tarihi düşünülür.';
}
