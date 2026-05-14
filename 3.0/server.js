require('dotenv').config();
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('votes.db');

// テーブルの自動作成
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    selected_option TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

// セッションの設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // ローカル開発のため
}));

// 認証チェック用ミドルウェア
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// ログインAPI
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.user = username;
        res.json({ message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// ログアウトAPI
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// ログイン状態確認API
app.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// 投票を受け取るエンドポイント (要認証)
app.post('/vote', isAuthenticated, (req, res) => {
    const { option } = req.body;
    if (!option) {
        return res.status(400).json({ error: 'Option is required' });
    }

    try {
        const stmt = db.prepare('INSERT INTO votes (selected_option) VALUES (?)');
        stmt.run(option);
        res.status(201).json({ message: 'Vote recorded' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// 集計結果を返すエンドポイント (要認証)
app.get('/votes', isAuthenticated, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT selected_option as option, COUNT(*) as count 
            FROM votes 
            GROUP BY selected_option
        `);
        const rows = stmt.all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch votes' });
    }
});

// 静的ファイルの配信 (ログイン判定が必要なため middleware を挟むか、HTML 側で制御)
// 今回は HTML 内の JS でログインフォームを出し分けるため、全体を公開したまま API でガードします。
app.use(express.static(__dirname));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
