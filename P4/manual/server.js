const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3001; // Backend runs on port 3001
const SECRET_KEY = 'super_secret_key_for_assignment'; 

app.use(express.json());
app.use(cors());

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Create Tables and Seed Admin
db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    // Articles Table
    db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        user_id INTEGER,
        username TEXT, 
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create Admin Account if it doesn't exist
    const adminQuery = "SELECT * FROM users WHERE username = ?";
    db.get(adminQuery, ['admin'], async (err, row) => {
        if (!row) {
            // Hash the password 'admin'
            const hashedPassword = await bcrypt.hash('admin', 10);
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                ['admin', hashedPassword, 'admin']);
            console.log("Admin account created (user: admin, pass: admin)");
        }
    });
});

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// 1. Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
            [username, hashedPassword, 'user'], 
            (err) => {
                if (err) return res.status(400).json({ error: "Username already exists" });
                res.status(201).json({ message: "User created" });
            });
    } catch {
        res.status(500).send();
    }
});

// 2. Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (!user) return res.status(400).send('User not found');
        
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
            res.json({ token, username: user.username, role: user.role, id: user.id });
        } else {
            res.send('Not Allowed');
        }
    });
});

// 3. Get All Articles
app.get('/articles', (req, res) => {
    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Post Article (Protected)
app.post('/articles', authenticateToken, (req, res) => {
    const { url } = req.body;
    db.run("INSERT INTO articles (url, user_id, username) VALUES (?, ?, ?)", 
        [url, req.user.id, req.user.username], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, url, user_id: req.user.id, username: req.user.username });
        });
});

// 5. Delete Article (Protected + Admin Logic)
app.delete('/articles/:id', authenticateToken, (req, res) => {
    const articleId = req.params.id;
    
    // Check if article exists and who owns it
    db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, article) => {
        if (!article) return res.status(404).json({ error: "Article not found" });

        // ALLOW if: Current user is Admin OR Current user owns the article
        if (req.user.role === 'admin' || req.user.id === article.user_id) {
            db.run("DELETE FROM articles WHERE id = ?", [articleId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Deleted successfully" });
            });
        } else {
            res.status(403).json({ error: "Unauthorized" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});