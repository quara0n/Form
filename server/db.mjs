import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Åpner (og oppretter) den lokale databasen med skjema på plass. */
export function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, "form.db"));
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS programmes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
  `);
  // Eldre databaser har ikke delingskolonnen ennå.
  const columns = db
    .prepare("PRAGMA table_info(programmes)")
    .all()
    .map((column) => column.name);
  if (!columns.includes("share_token"))
    db.exec("ALTER TABLE programmes ADD COLUMN share_token TEXT");
  return db;
}

export function createUser(db, { id, email, hash, salt, createdAt }) {
  db.prepare(
    "INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, email, hash, salt, createdAt);
}

export function findUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function findUserById(db, id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function createSession(db, { token, userId, createdAt, expiresAt }) {
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, createdAt, expiresAt);
}

export function findSession(db, token) {
  return db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
}

export function deleteSession(db, token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function listProgrammes(db, userId) {
  return db
    .prepare(
      "SELECT payload, share_token FROM programmes WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .all(userId)
    .map((row) => ({
      ...JSON.parse(row.payload),
      shareToken: row.share_token || null,
    }));
}

export function findProgramme(db, userId, id) {
  const row = db
    .prepare("SELECT * FROM programmes WHERE user_id = ? AND id = ?")
    .get(userId, id);
  return row ? { ...row, programme: JSON.parse(row.payload) } : undefined;
}

export function putProgramme(db, { userId, id, revision, updatedAt, payload }) {
  db.prepare(
    `INSERT INTO programmes (user_id, id, revision, updated_at, payload)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET
       revision = excluded.revision,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
  ).run(userId, id, revision, updatedAt, payload);
}

export function removeProgramme(db, userId, id) {
  db.prepare("DELETE FROM programmes WHERE user_id = ? AND id = ?").run(
    userId,
    id,
  );
}

export function setShareToken(db, userId, id, token) {
  db.prepare(
    "UPDATE programmes SET share_token = ? WHERE user_id = ? AND id = ?",
  ).run(token, userId, id);
}

export function findProgrammeByShareToken(db, token) {
  const row = db
    .prepare("SELECT payload FROM programmes WHERE share_token = ?")
    .get(token);
  return row ? JSON.parse(row.payload) : undefined;
}
