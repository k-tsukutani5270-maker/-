const express = require('express');
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
// 静的ファイルの配信 (index.html)
app.use(express.static(__dirname));

// 投票を受け取るエンドポイント
app.post('/vote', (req, res) => {
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

// 集計結果を返すエンドポイント
app.get('/votes', (req, res) => {
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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
