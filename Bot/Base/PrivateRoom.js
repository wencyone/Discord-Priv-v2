const PRIVATE_ROOM_EMOJI = '🌀';
const OLD_PRIVATE_ROOM_EMOJIS = ['‪‪❤︎‬'];

function formatPrivateRoomName(name) {
    let roomName = String(name || 'Özel Oda').trim();
    const roomEmojis = [PRIVATE_ROOM_EMOJI, ...OLD_PRIVATE_ROOM_EMOJIS];

    while (roomEmojis.some((emoji) => roomName.startsWith(emoji))) {
        const emoji = roomEmojis.find((item) => roomName.startsWith(item));
        roomName = roomName.slice(emoji.length).trim();
    }

    return `${PRIVATE_ROOM_EMOJI} ${roomName || 'Özel Oda'}`.slice(0, 100);
}

module.exports = { PRIVATE_ROOM_EMOJI, formatPrivateRoomName };
