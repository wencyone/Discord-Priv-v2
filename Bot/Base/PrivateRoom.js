const PRIVATE_ROOM_EMOJI = '‪‪❤︎‬';

function formatPrivateRoomName(name) {
    let roomName = String(name || 'Özel Oda').trim();
    while (roomName.startsWith(PRIVATE_ROOM_EMOJI)) {
        roomName = roomName.slice(PRIVATE_ROOM_EMOJI.length).trim();
    }

    return `${PRIVATE_ROOM_EMOJI} ${roomName || 'Özel Oda'}`.slice(0, 100);
}

module.exports = { PRIVATE_ROOM_EMOJI, formatPrivateRoomName };
