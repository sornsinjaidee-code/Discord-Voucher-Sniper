const { Client } = require('discord.js-selfbot-v13');
const cloudscraper = require('cloudscraper');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

let client = null;
let stats = { success: 0, fail: 0, amount: 0 };
const seenVouchers = new Set();

async function shootVoucher(code) {
    if (seenVouchers.has(code)) return;
    seenVouchers.add(code);
    const start = Date.now();

    try {
        const res = await cloudscraper.post(`https://gift.truemoney.com/campaign/vouchers/${code}/redeem`, {
            json: { mobile: process.env.PHONE, voucher_hash: code },
            headers: { 'Referer': `https://gift.truemoney.com/campaign/?v=${code}` }
        });

        const elapsed = Date.now() - start;
        if (res?.status?.code === 'SUCCESS') {
            const amt = parseFloat(res.data.my_ticket.amount_baht);
            stats.success++;
            stats.amount += amt;
            console.log(`💰 [${elapsed}ms] +${amt}฿ | ${code}`);
            // Webhook logic (กรอบสีเขียว)
            if (process.env.WEBHOOK) {
                axios.post(process.env.WEBHOOK, {
                    embeds: [{
                        title: "✅ รับซองสำเร็จ", color: 3066993,
                        fields: [
                            { name: "💵 จำนวน", value: `${amt} บาท`, inline: true },
                            { name: "💰 รวม", value: `${stats.amount} บาท`, inline: true }
                        ],
                        timestamp: new Date()
                    }]
                }).catch(() => {});
            }
        } else { stats.fail++; }
    } catch (e) { stats.fail++; }
}

function startBot() {
    if (client) return;
    client = new Client({ checkUpdate: false });

    client.on('ready', () => console.log(`✅ บอทเริ่มงาน: ${client.user.tag}`));

    client.on('messageCreate', async (msg) => {
        if (msg.author.id === client.user.id) return;
        // ดักลิงก์
        const codes = [...msg.content.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
        codes.forEach(c => shootVoucher(c));
        
        // ดัก QR
        if (msg.attachments.size > 0) {
            for (const att of msg.attachments.values()) {
                if (att.contentType?.startsWith('image/')) {
                    const res = await axios.get(att.url, { responseType: 'arraybuffer' });
                    const image = await Jimp.read(Buffer.from(res.data));
                    const qr = jsQR(new Uint8ClampedArray(image.bitmap.data), image.bitmap.width, image.bitmap.height);
                    if (qr) {
                        const qrCodes = [...qr.data.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
                        qrCodes.forEach(c => shootVoucher(c));
                    }
                }
            }
        }
    });

    client.login(process.env.TOKEN).catch(() => {
        if (fs.existsSync('.env')) fs.unlinkSync('.env');
    });
}

module.exports = { 
    startBot, 
    stopBot: () => { client?.destroy(); client = null; },
    getStats: () => stats,
    getDiscordUser: () => client?.user?.tag || "กำลังเชื่อมต่อ..."
};
