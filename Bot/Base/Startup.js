const RETRY_DELAYS = [10000, 30000, 60000, 120000, 300000];

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFatalStartupError(error) {
    const message = String(error?.message || '');
    return /TOKEN_INVALID|An invalid token was provided|Used disallowed intents|Privileged intent/i.test(message);
}

function isTemporaryNetworkError(error) {
    const message = String(error?.message || error || '');
    return /Opening handshake has timed out|Connect Timeout Error|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ENETUNREACH|secureConnect timed out|Server selection timed out|connection <monitor>.*timed out|getaddrinfo/i.test(message);
}

function attachClientErrorHandlers(client, label = 'Bot') {
    if (!client || client.__wencyErrorHandlersAttached) return;
    client.__wencyErrorHandlersAttached = true;

    const handleError = (error) => {
        const message = error?.message || String(error);
        if (isTemporaryNetworkError(error)) {
            console.warn(`[CLIENT] ${label}: geçici bağlantı hatası: ${message}`);
            return;
        }

        console.error(`[CLIENT] ${label}: ${message}`);
    };

    client.on('error', handleError);
    client.on('shardError', handleError);
}

async function startWithRetry(label, startFn) {
    let attempt = 0;

    while (true) {
        try {
            await startFn();
            return;
        } catch (error) {
            if (isFatalStartupError(error)) {
                console.error(`[STARTUP] ${label} bot başlatılamadı: ${error.message}`);
                process.exitCode = 1;
                return;
            }

            const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
            attempt += 1;
            console.error(`[STARTUP] ${label} bot başlatılamadı: ${error.message}`);
            console.warn(`[STARTUP] ${label}: ${Math.round(delay / 1000)} saniye sonra tekrar denenecek.`);
            await wait(delay);
        }
    }
}

function attachMongooseErrorHandlers(mongoose, label = 'Database') {
    if (!mongoose?.connection || mongoose.connection.__wencyErrorHandlersAttached) return;
    mongoose.connection.__wencyErrorHandlersAttached = true;

    mongoose.connection.on('error', (error) => {
        const message = error?.message || String(error);
        if (isTemporaryNetworkError(error)) {
            console.warn(`[DATABASE] ${label}: geçici bağlantı hatası: ${message}`);
            return;
        }

        console.error(`[DATABASE] ${label}: ${message}`);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn(`[DATABASE] ${label}: bağlantı koptu, mongoose otomatik yeniden deneyecek.`);
    });

    mongoose.connection.on('reconnected', () => {
        console.log(`[DATABASE] ${label}: bağlantı yeniden kuruldu.`);
    });
}

module.exports = { attachClientErrorHandlers, attachMongooseErrorHandlers, startWithRetry };
