const { Client } = require('discord.js-selfbot-v13');
const cloudscraper = require('cloudscraper');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const axios = require('axios');
require('dotenv').config();

let client = null;
let stats = { success: 0, fail: 0, amount: 0 };
const seenVouchers = new Set();

async function sendWebhook(amount, voucher, speed) {
    const webhook = process.env.WEBHOOK;
    if (!webhook) return;
    try {
        await axios.post(webhook, {
            embeds: [{
                title: "✅ รับซอง TrueMoney สำเร็จ",
                color: 3066993, // สีเขียวกรอบตามที่ขอ
                fields: [
                    { name: "💵 จำนวนเงิน", value: `**${amount.toFixed(2)}** บาท`, inline: true },
                    { name: "💰 ยอดรวม", value: `**${stats.amount.toFixed(2)}** บาท`, inline: true },
                    { name: "⚡ ความเร็ว", value: `**${speed}**ms`, inline: false },
                    { name: "🔗 โค้ด", value: `\`${voucher}\`` }
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
        const response = await cloudscraper.post(`https://gift.truemoney.com/campaign/vouchers/${code}/redeem`, {
            json: { mobile: process.env.PHONE, voucher_hash: code },
            headers: { 'Referer': `https://gift.truemoney.com/campaign/?v=${code}` }
        });

        const elapsed = Date.now() - start;
        if (response && response.status && response.status.code === 'SUCCESS') {
            const amt = parseFloat(response.data.my_ticket.amount_baht);
            stats.success++;
            stats.amount += amt;
            console.log(`💰 [${elapsed}ms] +${amt}฿`);
            await sendWebhook(amt, code, elapsed);
        } else {
            stats.fail++;
        }
    } catch (err) {
        stats.fail++;
    }
}

function extractCodes(text) {
    const pattern = /v=([a-zA-Z0-9]{10,})/gi;
    return [...text.matchAll(pattern)].map(m => m[1]);
}

function startBot() {
    if (client) return;
    client = new Client({ checkUpdate: false });
    
    client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));
    
    client.on('messageCreate', async (msg) => {
        if (msg.author.id === client.user.id) return;
        
        // 1. Text
        const codes = extractCodes(msg.content || "");
        codes.forEach(c => shootVoucher(c));
        
        // 2. Attachments (QR)
        for (const attachment of msg.attachments.values()) {
            if (attachment.contentType?.startsWith('image/')) {
                try {
                    const res = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                    const image = await Jimp.read(Buffer.from(res.data));
                    const qr = jsQR(new Uint8ClampedArray(image.bitmap.data), image.bitmap.width, image.bitmap.height);
                    if (qr) extractCodes(qr.data).forEach(c => shootVoucher(c));
                } catch (e) {}
            }
        }
    });

    client.login(process.env.TOKEN).catch(e => console.error("Login Error"));
}

function stopBot() {
    if (client) { client.destroy(); client = null; }
}

module.exports = { startBot, stopBot, getStats: () => stats };