import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists in production
const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : process.cwd();
if (process.env.NODE_ENV === 'production' && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(dataDir, 'babyfae.db')
  : path.resolve(process.cwd(), 'babyfae.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    
    // Configure SQLite for optimal performance and safety
    db.serialize(() => {
      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL;', (err) => {
        if (err) {
          console.error('Failed to enable WAL mode:', err);
        } else {
          console.log('WAL mode enabled');
        }
      });
      
      // Set synchronous mode to NORMAL for better performance while maintaining safety
      db.run('PRAGMA synchronous = NORMAL;', (err) => {
        if (err) console.error('Failed to set synchronous mode:', err);
      });
      
      // Set WAL autocheckpoint
      db.run('PRAGMA wal_autocheckpoint = 1000;', (err) => {
        if (err) console.error('Failed to set WAL autocheckpoint:', err);
      });
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) console.error('Failed to enable foreign keys:', err);
      });
      
      // Set cache size (negative value means KB, -2000 = 2MB)
      db.run('PRAGMA cache_size = -2000;', (err) => {
        if (err) console.error('Failed to set cache size:', err);
      });
      
      initDatabase();
    });
  }
});

function initDatabase() {
  db.serialize(() => {
    // Notification Schedules
    db.run(`
      CREATE TABLE IF NOT EXISTS notification_schedules (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        chat_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        schedule_data TEXT NOT NULL,
        next_run INTEGER,
        enabled INTEGER DEFAULT 1
      )
    `);

    // Users Table (Profile & Settings)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        profile_data TEXT DEFAULT '{}',
        settings_data TEXT DEFAULT '{}',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Activities Table
    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        telegram_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Custom Activities Definitions
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_activities (
        id TEXT PRIMARY KEY,
        telegram_id INTEGER NOT NULL,
        data TEXT NOT NULL
      )
    `);

    // Growth Records
    db.run(`
      CREATE TABLE IF NOT EXISTS growth_records (
        id TEXT PRIMARY KEY,
        telegram_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        data TEXT NOT NULL
      )
    `);

    // Indexes for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_activities_telegram_id ON activities(telegram_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp ON activities(telegram_id, timestamp DESC)');
    db.run('CREATE INDEX IF NOT EXISTS idx_custom_activities_telegram_id ON custom_activities(telegram_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_growth_records_telegram_id ON growth_records(telegram_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_growth_records_date ON growth_records(telegram_id, date DESC)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notification_schedules_next_run ON notification_schedules(next_run, enabled) WHERE enabled = 1');
    db.run('CREATE INDEX IF NOT EXISTS idx_notification_schedules_user ON notification_schedules(user_id)');
    
    console.log('All database tables and indexes initialized.');
  });
}
