module.exports = {
    name: 'kaccm',
    aliases: ['kac-cm', 'malafat'],
    category: 'Fun',

    execute: async (client, message) => {
        const cm = Math.floor(Math.random() * 50) + 1;
        let text = '';
        if (cm < 10) text = 'Kış gelmiş galiba...';
        else if (cm < 20) text = 'Ortalama bir performans.';
        else if (cm < 35) text = 'Maşallah, nazar değmesin!';
        else text = 'Bu ne böyle, ruhsat aldın mı buna?';

        return message.reply(`Malafat tam **${cm} cm**!\n${text}`);
    },
};
