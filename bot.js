const { Client, Intents } = require('discord.js'); // เปลี่ยนมาใช้ Library มาตรฐาน
const cloudscraper = require('cloudscraper');
const axios = require('axios');
require('dotenv').config();

let client = null;
let stats = { success: 0, fail: 0, amount: 0 };
let currentUserName = "กำลังเชื่อมต่อ...";

function startBot() {
    if (client) return;
    // เปิดทุก Intents เพื่อให้บอทเห็นข้อความแน่นอน
    client = new Client({ 
        intents: [32767],
        checkUpdate: false 
    });

    client.on('ready', () => {
        currentUserName = client.user.tag;
        console.log(`✅ เชื่อมต่อสำเร็จ: ${currentUserName}`);
    });

    client.on('messageCreate', async (msg) => {
        // ระบบดักซอง
        const codes = [...msg.content.matchAll(/v=([A-Za-z0-9]{10,})/gi)].map(m => m[1]);
        for (const code of codes) {
            try {
                const res = await cloudscraper.post(`https://gift.truemoney.com/campaign/vouchers/${code}/redeem`, {
                    json: { mobile: process.env.PHONE, voucher_hash: code }
                });
                if (res?.status?.code === 'SUCCESS') {
                    stats.success++;
                    stats.amount += parseFloat(res.data.my_ticket.amount_baht);
                } else { stats.fail++; }
            } catch (e) { stats.fail++; }
        }
    });

    // บังคับ Login โดยตัดคำว่า "Bot " ออก (ในกรณีที่เป็น User Token จริงๆ)
    client.login(process.env.TOKEN).catch(err => {
        console.error("❌ Login Error:", err.message);
        currentUserName = "Login ล้มเหลว: " + err.message;
    });
}

module.exports = { 
    startBot, 
    getStats: () => stats,
    getDiscordUser: () => currentUserName,
    stopBot: () => { client?.destroy(); client = null; }
};
