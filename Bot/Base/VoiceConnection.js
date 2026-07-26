const {
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const reconnectTimers = new Map();
const connectionPromises = new Map();
const reconnectAttempts = new Map();
const voiceMonitors = new Map();

const MONITOR_INTERVAL = 30000;

function scheduleReconnect(client, guild, channelId, label, group) {
    const key = `${guild.id}:${group}`;
    const attempts = (reconnectAttempts.get(key) || 0) + 1;
    const delay = Math.min(300000, 15000 * attempts);
    clearTimeout(reconnectTimers.get(key));
    reconnectAttempts.set(key, attempts);
    reconnectTimers.set(key, setTimeout(() => {
        reconnectTimers.delete(key);
        connectBotToVoice(client, guild, channelId, label).catch((error) => {
            console.error(`[VOICE] ${label}: yeniden bağlanma başarısız: ${error.message}`);
        });
    }, delay));
    return delay;
}

function isTemporaryVoiceError(error) {
    return /Unexpected server response: 52[0-4]|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ENETUNREACH|socket hang up|getaddrinfo/i.test(error?.message || '');
}

function startVoiceConnectionMonitor(client, guild, channelId, label = 'Bot') {
    if (!client?.user || !guild || !channelId) return null;

    const group = client.user.id;
    const key = `${guild.id}:${group}:monitor`;
    clearInterval(voiceMonitors.get(key));

    const ensure = async () => {
        const connection = getVoiceConnection(guild.id, group);
        const status = connection?.state?.status;
        if ([VoiceConnectionStatus.Ready, VoiceConnectionStatus.Connecting, VoiceConnectionStatus.Signalling].includes(status)) return;

        if (status === VoiceConnectionStatus.Destroyed || status === VoiceConnectionStatus.Disconnected || !connection) {
            await connectBotToVoice(client, guild, channelId, label).catch((error) => {
                console.error(`[VOICE] ${label}: monitor yeniden bağlanamadı: ${error.message}`);
            });
        }
    };

    ensure().catch((error) => console.error(`[VOICE] ${label}: monitor kontrolü başarısız: ${error.message}`));
    voiceMonitors.set(key, setInterval(() => {
        ensure().catch((error) => console.error(`[VOICE] ${label}: monitor kontrolü başarısız: ${error.message}`));
    }, MONITOR_INTERVAL));
    return voiceMonitors.get(key);
}

async function connectBotToVoice(client, guild, channelId, label = 'Bot') {
    if (!client?.user || !guild || !channelId) return null;

    const channel = guild.channels.cache.get(channelId)
        || await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
        console.error(`[VOICE] ${label}: System.channelID geçerli bir ses kanalı değil (${channelId}).`);
        return null;
    }

    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    const permissions = me ? channel.permissionsFor(me) : null;
    if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions?.has(PermissionFlagsBits.Connect)) {
        console.error(`[VOICE] ${label}: ${channel.name} kanalında Görüntüle/Bağlan yetkisi eksik.`);
        return null;
    }

    const group = client.user.id;
    const key = `${guild.id}:${group}`;
    if (connectionPromises.has(key)) return connectionPromises.get(key);

    const connectPromise = (async () => {
        const current = getVoiceConnection(guild.id, group);
        if (current?.state?.status === VoiceConnectionStatus.Ready) return current;
        if (current && current.state.status !== VoiceConnectionStatus.Destroyed) {
            try {
                await entersState(current, VoiceConnectionStatus.Ready, 10000);
                return current;
            } catch {
                current.destroy();
            }
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
            group,
        });

        connection.on('stateChange', (_oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Destroyed) {
                console.warn(`[VOICE] ${label}: bağlantı kapandı, yeniden bağlanma planlandı.`);
                scheduleReconnect(client, guild, channelId, label, group);
            }
        });

        connection.on('error', (error) => {
            const delay = scheduleReconnect(client, guild, channelId, label, group);
            const retryText = `${Math.round(delay / 1000)} saniye sonra tekrar denenecek`;
            if (isTemporaryVoiceError(error)) {
                console.warn(`[VOICE] ${label}: geçici Discord voice hatası: ${error.message}, ${retryText}.`);
                return;
            }

            console.error(`[VOICE] ${label}: ${error.message}, ${retryText}.`);
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30000);
            reconnectAttempts.delete(key);
            console.log(`[VOICE] ${label}: ${channel.name} kanalına bağlandı.`);

            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                } catch {
                    if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
                    scheduleReconnect(client, guild, channelId, label, group);
                }
            });

            return connection;
        } catch (error) {
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            const reason = error?.name === 'AbortError' ? 'bağlantı zaman aşımına uğradı' : error.message;
            const delay = scheduleReconnect(client, guild, channelId, label, group);
            const retryText = `${Math.round(delay / 1000)} saniye sonra tekrar denenecek`;
            if (isTemporaryVoiceError(error)) {
                console.warn(`[VOICE] ${label}: Discord voice gateway gecici hata verdi (${reason}), ${retryText}.`);
            } else {
                console.error(`[VOICE] ${label}: bağlantı kurulamadı: ${reason}, ${retryText}.`);
            }
            return null;
        }
    })();

    connectionPromises.set(key, connectPromise);
    try {
        return await connectPromise;
    } finally {
        connectionPromises.delete(key);
    }
}

module.exports = { connectBotToVoice, startVoiceConnectionMonitor };
