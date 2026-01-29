const { Client } = require('discord.js-selfbot-v13');
const cloudscraper = require('cloudscraper');
const axios = require('axios');
const Jimp = require('jimp');
const jsQR = require('jsqr');
require('dotenv').config();

let client = null;
let stats = { success: 0, fail: 0, amount: 0 };
const seenVouchers = new Set();

async function sendToWebhook(amount, code, speed) {
    if (!process.env.WEBHOOK) return;
    try {
        await axios.post(process.env.WEBHOOK, {
            embeds: [{
                title: "✅ รับซอง TrueMoney สำเร็จ",
                color: 3066993,
                fields: [
                    { name: "💵 จำนวนเงิน", value: `**${amount.toFixed(2)}** บาท`, inline: true },
                    { name: "💰 ยอดสะสม", value: `**${stats.amount.toFixed(2)}** บาท`, inline: true },
                    { name: "⚡ ความเร็ว", value: `**${speed}**ms`, inline: false }
                ],
                timestamp: new Date()
            }]
        });
    } catch (e) {}
}

async function shootVoucher(code) {
    if (seenVouchers.has(code)) return;
    seenVouchers.add(code);
    const start = Date.now();

    try {
        const res = await cloudscraper.post(`https://gift.truemoney.com/campaign/vouchers/${code}/redeem`, {
            json: { mobile: process.env.PHONE, voucher_hash: code },
            headers: { 'Referer': `https://gift.truemoney.com/campaign/?v=${code}` }
        });

        const speed = Date.now() - start;
        if (res?.status?.code === 'SUCCESS') {
            const amt = parseFloat(res.data.my_ticket.amount_baht);
            stats.success++;
            stats.amount += amt;
            console.log(`💰 [${speed}ms] +${amt}฿ | ${code}`);
            await sendToWebhook(amt, code, speed);
        } else {
            stats.fail++;
            console.log(`⚠️ [${speed}ms] ${res?.status?.code || 'ERROR'} | ${code}`);
        }
    } catch (e) { stats.fail++; }
}

function startBot() {
    if (client) return;
    client = new Client({ checkUpdate: false });

    client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));

    client.on('messageCreate', async (msg) => {
        // ดักทุกลิงก์ซอง ไม่ว่าใครจะส่ง
        const codes = [...msg.content.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
        codes.forEach(c => shootVoucher(c));

        // ดักจากรูปภาพ (QR Code)
        for (const attachment of msg.attachments.values()) {
            if (attachment.contentType?.startsWith('image/')) {
                try {
                    const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                    const image = await Jimp.read(Buffer.from(response.data));
                    const qr = jsQR(new Uint8ClampedArray(image.bitmap.data), image.bitmap.width, image.bitmap.height);
                    if (qr) {
                        const qrCodes = [...qr.data.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
                        qrCodes.forEach(c => shootVoucher(c));
                    }
                } catch (e) {}
            }
        }
    });

    client.login(process.env.TOKEN).catch(() => {
        console.error("TOKEN INVALID");
        if (fs.existsSync('.env')) fs.unlinkSync('.env');
    });
}

module.exports = { 
    startBot, 
    stopBot: () => { client?.destroy(); client = null; },
    getStats: () => stats,
    getDiscordUser: () => client?.user?.tag || "CONNECTING..."
};
