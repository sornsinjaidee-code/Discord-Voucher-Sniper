const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { startBot, stopBot, getStats, getDiscordUser } = require('./bot.js');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

const htmlTemplate = (title, body) => `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #050505; --card: #0d0d0d; --accent: #00ff41; --text: #fff; --border: #1a1a1a; }
        body { background: var(--bg); color: var(--text); font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { background: var(--card); border: 1px solid var(--border); padding: 30px; border-radius: 8px; width: 100%; max-width: 450px; box-shadow: 0 0 20px rgba(0,255,65,0.1); border-top: 3px solid var(--accent); }
        h1 { color: var(--accent); font-size: 18px; margin-bottom: 20px; }
        .user-info { margin-bottom: 20px; padding: 10px; border-bottom: 1px dashed var(--border); color: #888; font-size: 13px; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .stat-box { background: #000; border: 1px solid var(--border); padding: 15px; text-align: center; }
        .stat-label { font-size: 10px; color: #555; text-transform: uppercase; }
        .stat-value { font-size: 20px; color: var(--text); font-weight: bold; }
        input { width: 100%; background: #000; border: 1px solid var(--border); padding: 12px; margin-bottom: 10px; color: var(--accent); outline: none; box-sizing: border-box; }
        button { width: 100%; padding: 15px; background: var(--accent); border: none; color: #000; font-weight: bold; cursor: pointer; }
        .btn-reset { background: transparent; color: #ff4141; border: 1px solid #411; margin-top: 15px; }
    </style>
</head>
<body><div class="container">${body}</div></body>
</html>`;

app.get('/', (req, res) => {
    if (!fs.existsSync('.env')) {
        res.send(htmlTemplate("Setup", `
            <h1>> INITIALIZE_SYSTEM</h1>
            <form action="/save" method="POST">
                <input type="text" name="token" placeholder="DISCORD_USER_TOKEN" required>
                <input type="text" name="phone" placeholder="WALLET_NUMBER (08xxxxxxxx)" required>
                <input type="text" name="webhook" placeholder="DISCORD_WEBHOOK_URL">
                <button type="submit">CONNECT & START</button>
            </form>
        `));
    } else {
        const stats = getStats();
        res.send(htmlTemplate("Dashboard", `
            <h1>> SNIPER_ONLINE</h1>
            <div class="user-info">ACCOUNT: <span style="color:#00ff41">${getDiscordUser()}</span></div>
            <div class="stats">
                <div class="stat-box"><div class="stat-label">Success</div><div class="stat-value">${stats.success}</div></div>
                <div class="stat-box"><div class="stat-label">Failed</div><div class="stat-value">${stats.fail}</div></div>
                <div class="stat-box" style="grid-column: span 2;">
                    <div class="stat-label">Revenue</div>
                    <div class="stat-value" style="font-size: 30px; color: #00ff41;">฿ ${stats.amount.toFixed(2)}</div>
                </div>
            </div>
            <button onclick="location.href='/reset'" class="btn-reset">TERMINATE SYSTEM</button>
            <script>setTimeout(()=>location.reload(), 5000)</script>
        `));
    }
});

app.post('/save', (req, res) => {
    fs.writeFileSync('.env', `TOKEN=${req.body.token}\nPHONE=${req.body.phone}\nWEBHOOK=${req.body.webhook || ''}`);
    res.redirect('/');
    startBot();
});

app.get('/reset', (req, res) => {
    stopBot();
    if (fs.existsSync('.env')) fs.unlinkSync('.env');
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Web UI: http://localhost:${PORT}`);
    if (fs.existsSync('.env')) startBot();
});
