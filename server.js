const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// リクエストログ
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 静的ファイルの配信設定（デバッグ情報付き）
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        console.log('静的ファイル配信:', path);
    }
}));

// ルートパス
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// /demo パス
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// /demo/ パス（末尾にスラッシュ）
app.get('/demo/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 明示的なCSSファイル配信
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'style.css'));
});

// 明示的なJSファイル配信
app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'script.js'));
});

// 404エラーハンドリング
app.use((req, res) => {
    console.log('404エラー:', req.url);
    res.status(404).send('ページが見つかりません: ' + req.url);
});

app.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`デモページ: http://localhost:${PORT}/demo`);
    console.log('Ctrl+C でサーバーを停止できます');
});