const { Client } = require('discord.js-selfbot-v13');
const cloudscraper = require('cloudscraper');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

let client = null;
let stats = { success: 0, fail: 0, amount: 0 };
let currentUserName = "กำลังเชื่อมต่อ...";

async function shootVoucher(code) {
    if (!code) return;
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
        } else {
            stats.fail++;
            console.log(`❌ [${elapsed}ms] ${res?.status?.message || 'ซองมีปัญหา'} | ${code}`);
        }
    } catch (e) {
        stats.fail++;
    }
}

function startBot() {
    if (client) return;
    client = new Client({ checkUpdate: false });

    client.on('ready', () => {
        currentUserName = client.user.tag;
        console.log(`✅ บอทออนไลน์แล้ว: ${currentUserName}`);
    });

    client.on('messageCreate', async (msg) => {
        // ดักทุกลิงก์ซอง
        const codes = [...msg.content.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
        codes.forEach(c => shootVoucher(c));
    });

    client.login(process.env.TOKEN).catch(err => {
        console.error("❌ LOGIN FAILED:", err.message);
        currentUserName = "TOKEN ผิด/โดนบล็อก";
        // ลบไฟล์ config เพื่อให้เริ่มใหม่ได้
        if (fs.existsSync('.env')) fs.unlinkSync('.env');
    });
}

module.exports = { 
    startBot, 
    stopBot: () => { client?.destroy(); client = null; },
    getStats: () => stats,
    getDiscordUser: () => currentUserName
};
