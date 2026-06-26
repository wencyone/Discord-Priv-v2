const UserModel = require('../Schema/User');

async function getDocument(userId) {
    let document = await UserModel.findOne({ id: userId });
    if (!document) {
        document = new UserModel({ id: userId });
        await document.save();
    }
    if (!document.inventory) document.inventory = {};
    if (typeof document.inventory.cash !== 'number') document.inventory.cash = 0;
    return document;
}

async function getAccount(userId) {
    const document = await getDocument(userId);
    return {
        document,
        hasAccount: Boolean(document.inventory.hasAccount),
        cardNumber: document.inventory.cardNumber,
        coin: Number(document.inventory.cash || 0),
        dailyTimestamp: Number(document.inventory.dailyTimestamp || 0),
        lastBegTime: Number(document.inventory.lastBegTime || 0),
    };
}

async function updateAccount(userId, patch) {
    const document = await getDocument(userId);
    Object.assign(document.inventory, patch);
    document.markModified('inventory');
    await document.save();
    return getAccount(userId);
}

async function addCoins(userId, amount) {
    const account = await getAccount(userId);
    return updateAccount(userId, { cash: Math.max(0, account.coin + amount) });
}

function formatDinar(value) {
    return `${Number(value || 0).toLocaleString('tr-TR')} Dinar`;
}

function generateCardNumber() {
    const parts = [];
    for (let i = 0; i < 4; i++) {
        parts.push(String(Math.floor(1000 + Math.random() * 9000)));
    }
    return parts.join(' ');
}

function getPrefix() {
    return global.system?.Private?.Prefix?.[0] || '.';
}

function mustUseChannel(message, channelId, allowAdmin = false) {
    const channel = message.guild?.channels.cache.get(channelId);
    if (!channel) return null;
    if (message.channel.id === channel.id) return null;
    if (allowAdmin && message.member?.permissions?.has('Administrator')) return null;
    return channel;
}

module.exports = {
    addCoins,
    formatDinar,
    generateCardNumber,
    getAccount,
    getDocument,
    getPrefix,
    mustUseChannel,
    updateAccount,
};
