require('dotenv').config(); // .env を読み込む

const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// テンプレートエンジンを EJS に設定
app.set('view engine', 'ejs');

// 静的ファイルの配信を有効化（CSS, JS など）
app.use(express.static('public'));

// フォームのデータを取得するためのミドルウェア
app.use(express.urlencoded({ extended: false }));

// データベース接続の設定（.env の値を使用）
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL
});

// データベース接続確認
connection.connect((err) => {
  if (err) {
    console.error('データベース接続エラー:', err);
    process.exit(1); // 接続失敗時にアプリを終了
  } else {
    console.log('データベースに接続しました！');
  }
});

// ================================
// ルーティング
// ================================

// トップページのルート
app.get('/', (req, res) => {
  res.render('top.ejs');
});

// 新しいアイテムを追加するページのルート
app.get('/new', (req, res) => {
  res.render('new.ejs');
});

// 買い物リストを一覧表示するページのルート
app.get('/index', (req, res) => {
  connection.query('SELECT * FROM items ORDER BY id ASC', (error, results) => {
    if (error) {
      console.error('MySQL クエリエラー:', error);
      return res.status(500).send('データベースエラーが発生しました');
    }
    res.render('index.ejs', { items: results || [] });
  });
});

// ================================
// CRUD処理
// ================================

// 【CREATE】新しいアイテムをデータベースに追加
app.post('/create', (req, res) => {
  const itemName = req.body.itemName; // フォームの入力データを取得

  if (!itemName) {
    return res.status(400).send('アイテム名が入力されていません'); // 入力が空の場合はエラーメッセージを返す
  }

  connection.query(
    'INSERT INTO items (name) VALUES (?)',
    [itemName],
    (error, results) => {
      if (error) {
        console.error('データ追加エラー:', error);
        return res.status(500).send('データベースエラーが発生しました');
      }
      res.redirect('/index');
    }
  );
});

// 【DELETE】アイテムを削除し、IDを振り直す
app.post('/delete/:id', (req, res) => {
  connection.query(
    'DELETE FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.error('データ削除エラー:', error);
        return res.status(500).send('データ削除時にエラーが発生しました');
      }

      // **IDの振り直し処理（修正済み）**
      connection.query('SET @num = 0', (error) => {
        if (error) {
          console.error('IDリセットエラー:', error);
          return res.status(500).send('IDのリセット中にエラーが発生しました');
        }

        connection.query('UPDATE items SET id = (@num := @num + 1)', (error) => {
          if (error) {
            console.error('ID更新エラー:', error);
            return res.status(500).send('IDの更新中にエラーが発生しました');
          }

          connection.query('ALTER TABLE items AUTO_INCREMENT = 1', (error) => {
            if (error) {
              console.error('AUTO_INCREMENT リセットエラー:', error);
              return res.status(500).send('AUTO_INCREMENT のリセット中にエラーが発生しました');
            }

            // **IDの振り直しが完了したら、一覧ページへリダイレクト**
            res.redirect('/index');
          });
        });
      });
    }
  );
});


// 【READ】アイテムを編集するためのページ
app.get('/edit/:id', (req, res) => {
  connection.query(
    'SELECT * FROM items WHERE id = ?',
    [req.params.id],
    (error, results) => {
      if (error) {
        console.error('データ取得エラー:', error);
        return res.status(500).send('データベースエラーが発生しました');
      }
      if (results.length === 0) {
        return res.status(404).send('指定されたアイテムが見つかりません');
      }
      res.render('edit.ejs', { item: results[0] });
    }
  );
});

// 【UPDATE】アイテムの更新処理
app.post('/update/:id', (req, res) => {
  const itemName = req.body.itemName;

  if (!itemName) {
    return res.status(400).send('アイテム名が空です');
  }

  connection.query(
    'UPDATE items SET name = ? WHERE id = ?',
    [itemName, req.params.id],
    (error, results) => {
      if (error) {
        console.error('データ更新エラー:', error);
        return res.status(500).send('データベースエラーが発生しました');
      }
      res.redirect('/index');
    }
  );
});

// ================================
// サーバーを起動
// ================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
