require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
const PORT = 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_unsafe_key';

app.use(express.json());
app.use(cors());

// --- SECURITY: Rate Limiter ---
// Blocks brute-force attacks: Max 5 login attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: "Too many login attempts, please try again later."
});

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        user_id INTEGER,
        username TEXT, 
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Seed Admin
    db.get("SELECT * FROM users WHERE username = ?", ['admin'], async (err, row) => {
        if (!row) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                ['admin', hashedPassword, 'admin']);
            console.log("Admin account created.");
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

// 1. Register (With Password Strength Check)
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }
    
    // OWASP: Enforce password complexity
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

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

// 2. Login (With Rate Limiting)
app.post('/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (!user) return res.status(400).send('Invalid credentials');
        
        if (await bcrypt.compare(password, user.password)) {
            // OWASP: Token expires in 1 hour
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role }, 
                SECRET_KEY, 
                { expiresIn: '1h' }
            );
            res.json({ token, username: user.username, role: user.role, id: user.id });
        } else {
            res.status(400).send('Invalid credentials');
        }
    });
});

// 3. Get Articles
app.get('/articles', (req, res) => {
    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Post Article (With URL Validation against XSS)
app.post('/articles', authenticateToken, (req, res) => {
    const { url } = req.body;

    // OWASP: Validate Input (Prevent XSS/Injection)
    if (!validator.isURL(url, { protocols: ['http','https'], require_protocol: true })) {
        return res.status(400).json({ error: "Invalid URL. Must start with http:// or https://" });
    }

    db.run("INSERT INTO articles (url, user_id, username) VALUES (?, ?, ?)", 
        [url, req.user.id, req.user.username], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, url, user_id: req.user.id, username: req.user.username });
        });
});

// 5. Delete Article
app.delete('/articles/:id', authenticateToken, (req, res) => {
    const articleId = req.params.id;
    
    db.get("SELECT * FROM articles WHERE id = ?", [articleId], (err, article) => {
        if (!article) return res.status(404).json({ error: "Article not found" });

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