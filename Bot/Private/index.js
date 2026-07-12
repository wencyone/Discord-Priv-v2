const { Client, Partials, GatewayIntentBits, Events, EmbedBuilder, ActivityType, Collection, ChannelType, PermissionsBitField, ApplicationCommandType } = require('discord.js');
const { readdirSync, statSync, existsSync } = require('fs');
const Settings = require('../Schema/Settings')
const { startLeaderboardInterval, updateLeaderboard } = require('../Base/LeaderboardUtil');
const { connectBotToVoice } = require('../Base/VoiceConnection');
const { startGiveawayScheduler } = require('../Base/Giveaway');
const { startJailScheduler } = require('../Base/Jail');
const { startBoosterRoleScheduler } = require('../Base/BoosterRole');
const { attachClientErrorHandlers, startWithRetry } = require('../Base/Startup');

const client = global.client = new Client({ intents: Object.keys(GatewayIntentBits), partials: Object.keys(Partials) });
attachClientErrorHandlers(client, 'Private');
const system = global.system = require('../../System');
const functions = global.functions = require('../Base/Functions');

const roomContextCommands = [
    { name: 'Özel Oda Paneli', type: ApplicationCommandType.User },
];

const commands = client.commands = new Collection();
const afks = client.afks = new Collection();
const aliases = client.aliases = new Collection();
for (const category of readdirSync('./Commands/').filter((name) => statSync(`./Commands/${name}`).isDirectory())) {
    for (const file of readdirSync(`./Commands/${category}`).filter((name) => name.endsWith('.js'))) {
        const command = require(`./Commands/${category}/${file}`);
        commands.set(command.name, command);
        (command.aliases || []).forEach((alias) => aliases.set(alias, command.name));
    }
}
console.log(`[COMMAND] Komutlar Yüklendi!`);

for (const eventName of readdirSync('./Events/').filter((name) => statSync(`./Events/${name}`).isDirectory())) {
    for (const file of readdirSync(`./Events/${eventName}`)) {
        const fullPath = `./Events/${eventName}/${file}`;
        if (file.endsWith('.js') || (statSync(fullPath).isDirectory() && existsSync(`${fullPath}/index.js`))) {
            require(fullPath);
        }
    }
}
console.log(`[EVENT] Eventler Yüklendi!`);

client.on(Events.ClientReady, async () => {
    let message = system.Presence.Message[0] ? system.Presence.Message[Math.floor(Math.random() * system.Presence.Message.length)] : 'wency was here';

    client.user.setPresence({
        status: system.Presence.Status ? system.Presence.Status : 'online',
        activities: [
            {
                name: message,
                type: system.Presence.Type,
                url: 'https://www.twitch.tv/wency'
            },
        ],
    });

    const guild = client.guilds.cache.get(system.serverID);
    if (!guild) return;

    await guild.commands.set(roomContextCommands).catch((error) => console.error('[ROOM_CONTEXT_COMMANDS]', error));

    startGiveawayScheduler(client);
    startJailScheduler(client);
    startBoosterRoleScheduler(client);

    await connectBotToVoice(client, guild, system.channelID, 'Private');

    setInterval(async () => {
        const document = await Settings.findOne({ id: guild.id });
        if (!document) return;
        if (!document || !document.privateRooms) return;

        document.privateRooms.forEach(async (pr) => {
            const channel = guild.channels.cache.get(pr.channel);
            if (!channel) {
                await Settings.findOneAndUpdate({ id: guild.id }, { $pull: { privateRooms: { channel: pr.channel } } }, { upsert: true });
                return;
            }

            if (channel.members.size > 0) return;
            channel.delete().catch(() => null);
            await Settings.findOneAndUpdate({ id: guild.id }, { $pull: { privateRooms: { channel: pr.channel } } }, { upsert: true });
        });
    }, 10000);

    const document = await Settings.findOne({ id: guild.id });
    if (document?.leaderboardPanel?.channelId) {
        await updateLeaderboard(client, guild.id, document.leaderboardPanel).catch(() => {});
        startLeaderboardInterval(client, guild.id, document.leaderboardPanel);
    }

    console.log(`[BOT] ${client.user.tag} olarak giriş yaptı!`);
});


//GIF KORUMA 










//gif koruma son 
const mongoose = require('mongoose');

async function start() {
    await startWithRetry('Private', async () => {
        await mongoose.connect(system.database, { serverSelectionTimeoutMS: 15000 });
        console.log('[DATABASE] MongoDB bağlantısı başarılı.');
        await client.login(system.Private.Token);
    });
}

start();
