module.exports = async function Stat(client, message) {
    await global.functions.addStat({
        type: 'message',
        member: message.author,
        message: message,
    });
};
