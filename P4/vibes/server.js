const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'article-sharing-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);

    createAdminUser();
  });
}

async function createAdminUser() {
  db.get("SELECT * FROM Users WHERE username = 'admin'", async (err, row) => {
    if (err) {
      console.error('Error checking for admin user:', err);
      return;
    }
    if (!row) {
      try {
        const passwordHash = await bcrypt.hash('admin', 10);
        db.run(
          "INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)",
          ['admin', passwordHash, 'admin'],
          (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Admin user created (username: admin, password: admin)');
            }
          }
        );
      } catch (error) {
        console.error('Error hashing admin password:', error);
      }
    } else {
      console.log('Admin user already exists');
    }
  });
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    db.run(
      "INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)",
      [username, passwordHash, 'user'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }
        
        req.session.userId = this.lastID;
        req.session.username = username;
        req.session.role = 'user';
        
        res.json({ 
          message: 'Registration successful',
          user: { id: this.lastID, username, role: 'user' }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error processing registration' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get("SELECT * FROM Users WHERE username = ?", [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    try {
      const match = await bcrypt.compare(password, user.password_hash);
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({ 
        message: 'Login successful',
        user: { id: user.id, username: user.username, role: user.role }
      });
    } catch (error) {
      res.status(500).json({ error: 'Error processing login' });
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/me', isAuthenticated, (req, res) => {
  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    }
  });
});

app.post('/api/articles', isAuthenticated, (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  db.run(
    "INSERT INTO Articles (url, user_id) VALUES (?, ?)",
    [url, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating article' });
      }
      
      res.json({ 
        message: 'Article added successfully',
        article: { id: this.lastID, url, user_id: req.session.userId }
      });
    }
  );
});

app.get('/api/articles', isAuthenticated, (req, res) => {
  db.all(`
    SELECT Articles.*, Users.username 
    FROM Articles 
    JOIN Users ON Articles.user_id = Users.id 
    ORDER BY Articles.created_at DESC
  `, [], (err, articles) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching articles' });
    }
    res.json({ articles });
  });
});

app.delete('/api/articles/:id', isAuthenticated, (req, res) => {
  const articleId = req.params.id;
  const userId = req.session.userId;
  const userRole = req.session.role;

  db.get("SELECT * FROM Articles WHERE id = ?", [articleId], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (userRole !== 'admin' && article.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own articles' });
    }

    db.run("DELETE FROM Articles WHERE id = ?", [articleId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting article' });
      }
      res.json({ message: 'Article deleted successfully' });
    });
  });
});

app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
