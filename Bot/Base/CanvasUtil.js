const { createCanvas, loadImage } = require('canvas');

const WIDTH = 900;
const HEIGHT = 360;

const DEFAULT_BACKGROUND_URL = 'https://i.imgur.com/HJbjw2C.png';

async function createBase(title, subtitle = '', backgroundURL = DEFAULT_BACKGROUND_URL) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    if (backgroundURL) {
        try {
            const bg = await loadImage(backgroundURL);

            const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
            const bgW = bg.width * scale;
            const bgH = bg.height * scale;
            const bgX = (WIDTH - bgW) / 2;
            const bgY = (HEIGHT - bgH) / 2;

            ctx.drawImage(bg, bgX, bgY, bgW, bgH);

            ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        } catch {
            drawDefaultBackground(ctx);
        }
    } else {
        drawDefaultBackground(ctx);
    }

    drawSoftCircles(ctx);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Sans';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, 42, 64);

    if (subtitle) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '22px Sans';
        ctx.fillText(subtitle, 42, 98);
    }

    return { canvas, ctx };
}

function drawDefaultBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.45, '#1e1b4b');
    gradient.addColorStop(1, '#020617');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(700, 80, 20, 700, 80, 360);
    glow.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    glow.addColorStop(1, 'rgba(168, 85, 247, 0)');

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawSoftCircles(ctx) {
    const circles = [
        [105, 70, 34], [220, 265, 50], [370, 95, 42],
        [535, 255, 30], [665, 85, 62], [790, 250, 48],
        [135, 245, 26], [465, 125, 54], [720, 210, 24],
        [830, 120, 34],
    ];

    ctx.fillStyle = 'rgba(255,255,255,0.055)';

    for (const [x, y, r] of circles) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function drawPanel(ctx, x, y, width, height, radius = 20) {
    ctx.save();

    roundRect(ctx, x, y, width, height, radius);

    ctx.fillStyle = 'rgba(255,255,255,0.105)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

async function drawAvatar(ctx, user, x, y, size) {
    try {
        const avatar = await loadImage(
            user.displayAvatarURL({
                extension: 'png',
                size: 256,
            })
        );

        ctx.save();

        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(avatar, x, y, size, size);

        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
    } catch {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function centerText(ctx, text, x, y, width, font, color = '#ffffff') {
    ctx.save();

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(String(text), x + width / 2, y);

    ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 5) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;

        if (ctx.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = word;

            if (lines.length >= maxLines) break;
        } else {
            line = next;
        }
    }

    if (line && lines.length < maxLines) lines.push(line);

    lines.forEach((l, index) => {
        ctx.fillText(l, x, y + index * lineHeight);
    });
}

async function shipCard(user1, user2, percent, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    const bg = await loadImage(backgroundURL);

    const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
    const bgW = bg.width * scale;
    const bgH = bg.height * scale;
    const bgX = (WIDTH - bgW) / 2;
    const bgY = (HEIGHT - bgH) / 2;

    ctx.drawImage(bg, bgX, bgY, bgW, bgH);

    drawSoftCircles(ctx);

    drawPanel(ctx, 20, 25, 860, 280);

    await drawAvatar(ctx, user1, 65, 80, 120);
    await drawAvatar(ctx, user2, 715, 80, 120);

    centerText(ctx, user1.username, 40, 275, 170, 'bold 24px Sans');
    centerText(ctx, user2.username, 690, 275, 170, 'bold 24px Sans');

    ctx.save();

    ctx.font = 'bold 90px Sans';
    ctx.fillStyle = '#dbeafe';
    ctx.textAlign = 'center';
    ctx.fillText(`%${percent}`, 450, 165);

    ctx.font = '28px Sans';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(
        percent >= 70
            ? 'Bu iş olur gibi.'
            : percent >= 40
            ? 'Bir kahve şansı var.'
            : 'Evren biraz kararsız.',
        450,
        225
    );

    ctx.restore();

    return canvas.toBuffer('image/png');
}
async function shipMeetCard(user, guildName, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('TANISMA ISTEGI', guildName, backgroundURL);

    await drawAvatar(ctx, user, 60, 135, 130);

    drawPanel(ctx, 225, 125, 610, 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Sans';
    ctx.fillText(user.username, 260, 180);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '23px Sans';
    wrapText(ctx, 'Seninle tanismak istiyor. Belki guzel bir sohbet baslar.', 260, 220, 520, 32, 2);

    return canvas.toBuffer('image/png');
}

async function askolcerCard(user1, user2, percent, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase(
        'ASK OLCER',
        'Iki kullanici arasindaki enerji olculuyor.',
        backgroundURL
    );

    await drawAvatar(ctx, user1, 92, 135, 125);
    await drawAvatar(ctx, user2, 682, 135, 125);

    ctx.save();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(450, 198, 78, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(
        450,
        198,
        78,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (percent / 100)
    );
    ctx.stroke();

    ctx.restore();

    centerText(ctx, `%${percent}`, 360, 198, 180, 'bold 46px Sans', '#ffffff');

    centerText(
        ctx,
        percent >= 75 ? 'Mukemmel uyum' : percent >= 45 ? 'Tatli bir sans' : 'Biraz mesafe',
        300,
        288,
        300,
        '24px Sans',
        '#f8fafc'
    );

    return canvas.toBuffer('image/png');
}

async function tweetCard(user, text, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('TWEET', '', backgroundURL);

    drawPanel(ctx, 60, 92, 780, 220);

    await drawAvatar(ctx, user, 92, 122, 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px Sans';
    ctx.fillText(user.username, 190, 150);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Sans';
    ctx.fillText(`@${user.username.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'}`, 190, 180);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '25px Sans';
    wrapText(ctx, text, 92, 230, 700, 34, 3);

    return canvas.toBuffer('image/png');
}

async function economyCard(title, message, footer, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase(title, '', backgroundURL);

    drawPanel(ctx, 75, 115, 750, 155);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Sans';
    wrapText(ctx, message, 112, 170, 680, 38, 2);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px Sans';
    wrapText(ctx, footer, 112, 238, 680, 30, 2);

    return canvas.toBuffer('image/png');
}

async function begCard(type, message, footer, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const labels = {
        success: 'DILENME BASARILI',
        fail: 'KIMSE ORALAMADI',
        cooldown: 'BIRAZ BEKLE',
    };

    return economyCard(labels[type] || 'DILEN', message, footer, backgroundURL);
}

async function bankCard(user, cardNumber, balance, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('DINAR BANK', 'Kisisel hesap karti', backgroundURL);

    const x = 90;
    const y = 105;
    const w = 720;
    const h = 210;

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(1, '#581c87');

    roundRect(ctx, x, y, w, h, 24);

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    await drawAvatar(ctx, user, 122, 135, 74);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px Sans';
    ctx.fillText(user.username, 220, 162);

    ctx.font = '30px monospace';
    ctx.fillText(cardNumber, 122, 245);

    ctx.font = 'bold 24px Sans';
    ctx.fillText(`${Number(balance || 0).toLocaleString('tr-TR')} DINAR`, 520, 162);

    return canvas.toBuffer('image/png');
}

async function coinFlipCard(side, result, amount, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('YAZI TURA', '', backgroundURL);

    ctx.save();

    ctx.shadowColor = result === 'kazandı' ? '#22c55e' : '#ef4444';
    ctx.shadowBlur = 25;

    ctx.fillStyle = result === 'kazandı' ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(450, 190, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.restore();

    centerText(ctx, side.toUpperCase(), 330, 190, 240, 'bold 34px Sans');

    centerText(
        ctx,
        `${result.toUpperCase()} - ${Number(amount).toLocaleString('tr-TR')} DINAR`,
        200,
        315,
        500,
        'bold 24px Sans',
        '#f8fafc'
    );

    return canvas.toBuffer('image/png');
}

async function slotCard(slots, status, amount, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('SLOT MAKINESI', '', backgroundURL);

    drawPanel(ctx, 145, 110, 610, 155);

    slots.forEach((slot, index) => {
        const boxX = 205 + index * 170;
        const boxY = 132;
        const boxW = 120;
        const boxH = 110;

        drawPanel(ctx, boxX, boxY, boxW, boxH);

        ctx.save();
        ctx.font = '62px Sans';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(slot), boxX + boxW / 2, boxY + boxH / 2 + 2);
        ctx.restore();
    });

    centerText(
        ctx,
        `${status.toUpperCase()} ${amount ? `- ${Number(amount).toLocaleString('tr-TR')} DINAR` : ''}`,
        150,
        315,
        600,
        'bold 24px Sans',
        '#e2e8f0'
    );

    return canvas.toBuffer('image/png');
}

async function rpsStartCard(user, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const { canvas, ctx } = await createBase('TAS KAGIT MAKAS', 'Hamleni sec.', backgroundURL);

    await drawAvatar(ctx, user, 382, 118, 136);

    centerText(ctx, user.username, 300, 300, 300, 'bold 28px Sans');

    return canvas.toBuffer('image/png');
}

async function rpsCard(user, userChoice, botChoice, result, backgroundURL = DEFAULT_BACKGROUND_URL) {
    const names = {
        tkm_tas: 'TAS',
        tkm_kagit: 'KAGIT',
        tkm_makas: 'MAKAS',
    };

    const { canvas, ctx } = await createBase('OYUN BITTI', result, backgroundURL);

    drawPanel(ctx, 95, 130, 300, 125);
    drawPanel(ctx, 505, 130, 300, 125);

    centerText(ctx, `${user.username}: ${names[userChoice] || userChoice}`, 105, 192, 280, 'bold 24px Sans');
    centerText(ctx, `BOT: ${names[botChoice] || botChoice}`, 515, 192, 280, 'bold 24px Sans');

    return canvas.toBuffer('image/png');
}

async function blackjackCard(
    dealerHand,
    playerHand,
    dealerScore,
    playerScore,
    status,
    bet,
    backgroundURL = DEFAULT_BACKGROUND_URL
) {
    const { canvas, ctx } = await createBase(
        'BLACKJACK',
        `Bahis: ${Number(bet).toLocaleString('tr-TR')} Dinar`,
        backgroundURL
    );

    drawPanel(ctx, 70, 105, 760, 90);
    drawPanel(ctx, 70, 220, 760, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Sans';
    ctx.fillText(`Dealer (${dealerScore})`, 100, 135);
    ctx.fillText(`Sen (${playerScore})`, 100, 250);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '24px monospace';
    ctx.fillText(
        dealerHand.map((c) => (c.hidden ? '??' : c.value)).join('  '),
        100,
        172
    );
    ctx.fillText(
        playerHand.map((c) => c.value).join('  '),
        100,
        287
    );

    centerText(
        ctx,
        status.toUpperCase(),
        580,
        150,
        220,
        'bold 28px Sans',
        status === 'kazandın' || status === 'blackjack'
            ? '#86efac'
            : status === 'kaybettin'
            ? '#fca5a5'
            : '#fde68a'
    );

    return canvas.toBuffer('image/png');
}

//SAKIN GECME! 


module.exports = {
    askolcerCard,
    bankCard,
    begCard,
    blackjackCard,
    coinFlipCard,
    economyCard,
    rpsCard,
    rpsStartCard,
    shipCard,
    shipMeetCard,
    slotCard,
    tweetCard,
};