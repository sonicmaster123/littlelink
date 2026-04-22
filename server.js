require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_NAME = process.env.DB_NAME || 'littlelink';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function createDatabaseIfNotExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  
  await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
  console.log(`[DB] Database '${DB_NAME}' is ready`);
}

async function getDbConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME
  });
  return connection;
}

async function checkAndCreateTables() {
  const connection = await getDbConnection();
  
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'links'`,
    [DB_NAME]
  );
  
  if (tables.length === 0) {
    console.log('[DB] Table "links" not found, creating...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(2048) NOT NULL,
        category VARCHAR(100),
        icon_class VARCHAR(100),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    await connection.execute(`
      INSERT INTO links (name, url, category, icon_class, sort_order) VALUES
        ('LittleLink', 'https://littlelink.io', 'social', 'button-default', 1),
        ('GitHub', 'https://github.com', 'social', 'button-github', 2),
        ('Twitter/X', 'https://x.com', 'social', 'button-x', 3),
        ('YouTube', 'https://youtube.com', 'social', 'button-yt', 4),
        ('LinkedIn', 'https://linkedin.com', 'social', 'button-linked', 5)
    `);
    
    console.log('[DB] Table "links" created with sample data');
  } else {
    console.log('[DB] Table "links" already exists');
  }
  
  await connection.end();
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

app.get('/api/links', async (req, res) => {
  try {
    const connection = await getDbConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM links ORDER BY sort_order ASC, created_at DESC'
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/links', authMiddleware, async (req, res) => {
  try {
    const { name, url, category, icon_class, sort_order } = req.body;
    const connection = await getDbConnection();
    const [result] = await connection.execute(
      'INSERT INTO links (name, url, category, icon_class, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, url, category || null, icon_class || null, sort_order || 0]
    );
    const [newRow] = await connection.execute(
      'SELECT * FROM links WHERE id = ?',
      [result.insertId]
    );
    await connection.end();
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/links/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, category, icon_class, sort_order } = req.body;
    const connection = await getDbConnection();
    
    await connection.execute(
      'UPDATE links SET name = ?, url = ?, category = ?, icon_class = ?, sort_order = ? WHERE id = ?',
      [name, url, category || null, icon_class || null, sort_order || 0, id]
    );
    
    const [updatedRow] = await connection.execute(
      'SELECT * FROM links WHERE id = ?',
      [id]
    );
    await connection.end();
    
    if (updatedRow.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json(updatedRow[0]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/links/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getDbConnection();
    const [result] = await connection.execute(
      'DELETE FROM links WHERE id = ?',
      [id]
    );
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function initAndStartServer() {
  try {
    console.log('[Init] Starting database initialization...');
    
    await createDatabaseIfNotExists();
    await checkAndCreateTables();
    
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  LittleLink Dynamic is running!');
      console.log('========================================');
      console.log(`  Frontend: http://localhost:${PORT}`);
      console.log(`  API:      http://localhost:${PORT}/api/links`);
      console.log('========================================');
      console.log('  Admin credentials:');
      console.log(`    Username: ${ADMIN_USERNAME}`);
      console.log(`    Password: ${'*'.repeat(ADMIN_PASSWORD.length)}`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('[Init] Failed to initialize:', error.message);
    console.error('[Init] Please check your MySQL connection and .env configuration');
    process.exit(1);
  }
}

initAndStartServer();
