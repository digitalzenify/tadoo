import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const dataDir = process.env.DATA_DIR || path.resolve('data')
fs.mkdirSync(dataDir, { recursive: true })
export const db = new Database(path.join(dataDir, 'tadoo.sqlite'))
db.pragma('journal_mode = WAL')
db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, key_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, project TEXT NOT NULL DEFAULT 'Inbox', priority INTEGER NOT NULL DEFAULT 2, duration_minutes INTEGER NOT NULL DEFAULT 15, due_date TEXT, completed INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', parent_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL, remind_at TEXT NOT NULL, sent_at TEXT, FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY, settings TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
`)
// Labels were added after the first release, so existing databases get the column here.
if (!db.prepare('PRAGMA table_info(tasks)').all().some(column => column.name === 'labels')) db.exec("ALTER TABLE tasks ADD COLUMN labels TEXT NOT NULL DEFAULT ''")

export const id = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
export function hash(value) { return crypto.createHash('sha256').update(value).digest('hex') }
export function passwordHash(password) { const salt = crypto.randomBytes(16).toString('hex'); const key = crypto.scryptSync(password, salt, 64).toString('hex'); return `${salt}:${key}` }
export function passwordMatches(password, stored) { const [salt, key] = stored.split(':'); return crypto.timingSafeEqual(Buffer.from(key, 'hex'), crypto.scryptSync(password, salt, 64)) }
export function createToken(prefix = 'td_') { return prefix + crypto.randomBytes(32).toString('base64url') }
export function userFromToken(token) { if (!token) return null; const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(hash(token), now()); return row || null }
export function userFromApiKey(token) { if (!token) return null; const row = db.prepare(`SELECT u.* FROM api_keys k JOIN users u ON u.id=k.user_id WHERE k.key_hash=?`).get(hash(token)); return row || null }
export function publicTask(row) { const { user_id, duration_minutes, due_date, parent_id, created_at, updated_at, completed, labels, ...safe } = row; return { ...safe, completed: Boolean(completed), durationMinutes: duration_minutes, dueDate: due_date, parentId: parent_id, createdAt: created_at, updatedAt: updated_at, labels: String(labels || '').split(',').map(label => label.trim()).filter(Boolean) } }
export function publicUser(row) { return { id: row.id, email: row.email, createdAt: row.created_at } }
export function taskForUser(userId, taskId) { const row = db.prepare('SELECT * FROM tasks WHERE id=? AND user_id=?').get(taskId, userId); return row ? publicTask(row) : null }
export function labelsToColumn(labels) { const list = Array.isArray(labels) ? labels : String(labels || '').split(','); return [...new Set(list.map(label => String(label).trim().toLowerCase().slice(0, 24)).filter(Boolean))].slice(0, 8).join(',') }
export function settingsFor(userId) { const row = db.prepare('SELECT settings FROM user_settings WHERE user_id=?').get(userId); if (!row) return {}; try { return JSON.parse(row.settings) } catch { return {} } }
export function saveSettings(userId, settings) { db.prepare('INSERT INTO user_settings (user_id, settings, updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings, updated_at=excluded.updated_at').run(userId, JSON.stringify(settings), now()) }
