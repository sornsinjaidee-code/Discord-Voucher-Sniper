const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { startBot, stopBot, getStats } = require('./bot.js');
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
    <title>${title} | root@system</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #050505; --card-bg: #0d0d0d; --accent: #00ff41; --text: #ffffff; --border: #1a1a1a; --dim: #555; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'JetBrains Mono', monospace; }
        body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 4px; padding: 30px; width: 100%; max-width: 480px; position: relative; box-shadow: 0 0 30px rgba(0, 255, 65, 0.05); }
        .container::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--accent); }
        h1 { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 25px; color: var(--accent); }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .stat-card { border: 1px solid var(--border); padding: 15px; background: #000; }
        .stat-card small { color: var(--dim); font-size: 10px; text-transform: uppercase; display: block; }
        .stat-card span { display: block; font-size: 18px; color: var(--text); margin-top: 5px; }
        input { width: 100%; background: #000; border: 1px solid var(--border); padding: 12px; border-radius: 2px; color: var(--accent); margin-bottom: 12px; outline: none; font-size: 13px; }
        button { width: 100%; padding: 14px; border: 1px solid var(--accent); font-weight: 700; cursor: pointer; background: var(--accent); color: #000; transition: 0.3s; text-transform: uppercase; }
        button:hover { background: transparent; color: var(--accent); }
        .btn-reset { background: transparent; color: #ff4141; border-color: #441111; margin-top: 20px; font-size: 11px; }
    </style>
</head>
<body><div class="container">${body}</div></body>
</html>`;

app.get('/', (req, res) => {
    const configExists = fs.existsSync('.env');
    if (!configExists) {
        res.send(htmlTemplate("SETUP", `
            <h1>> INITIALIZE_SYSTEM</h1>
            <form action="/save" method="POST">
                <input type="text" name="token" placeholder="DISCORD_USER_TOKEN" required>
                <input type="text" name="phone" placeholder="WALLET_NUMBER (08xxxxxxxx)" required>
                <input type="text" name="webhook" placeholder="DISCORD_WEBHOOK_URL (Optional)">
                <button type="submit">START SNIPER</button>
            </form>
        `));
    } else {
        const stats = getStats();
        res.send(htmlTemplate("DASHBOARD", `
            <h1>> SNIPER_ONLINE</h1>
            <div class="stat-grid">
                <div class="stat-card"><small>Success</small><span>${stats.success}</span></div>
                <div class="stat-card"><small>Failed</small><span>${stats.fail}</span></div>
                <div class="stat-card" style="grid-column: span 2;"><small>Revenue</small><span style="color:var(--accent); font-size: 24px;">฿ ${stats.amount.toFixed(2)}</span></div>
            </div>
            <button onclick="if(confirm('RESET?')) location.href='/reset'" class="btn-reset">TERMINATE SYSTEM</button>
            <script>setTimeout(()=>location.reload(), 10000)</script>
        `));
    }
});

app.post('/save', (req, res) => {
    const content = `TOKEN=${req.body.token}\nPHONE=${req.body.phone}\nWEBHOOK=${req.body.webhook || ''}`;
    fs.writeFileSync('.env', content);
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