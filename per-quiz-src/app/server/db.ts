import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const path = process.env.DB_PATH ?? new URL('../data/per-quiz.db', import.meta.url).pathname
mkdirSync(dirname(path), { recursive: true })

export const db = new DatabaseSync(path)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name        TEXT NOT NULL,
    pass_hash   TEXT NOT NULL,
    lang        TEXT NOT NULL DEFAULT 'es',
    q_lang      TEXT NOT NULL DEFAULT 'es',
    theme       TEXT NOT NULL DEFAULT 'system',
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id            TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    paper         TEXT,
    title         TEXT NOT NULL,
    mode          TEXT NOT NULL,
    config        TEXT NOT NULL,
    question_ids  TEXT NOT NULL,
    time_limit    INTEGER,
    started_at    INTEGER NOT NULL,
    finished_at   INTEGER,
    elapsed       INTEGER NOT NULL DEFAULT 0,
    result        TEXT
  );
  CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id, started_at DESC);

  CREATE TABLE IF NOT EXISTS answers (
    attempt_id   TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  TEXT NOT NULL,
    choice       TEXT NOT NULL,
    correct      INTEGER NOT NULL,
    answered_at  INTEGER NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
  );
  CREATE INDEX IF NOT EXISTS answers_user ON answers(user_id, question_id);
  CREATE INDEX IF NOT EXISTS answers_question ON answers(question_id);

  CREATE TABLE IF NOT EXISTS bookmarks (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    PRIMARY KEY (user_id, question_id)
  );
`)
