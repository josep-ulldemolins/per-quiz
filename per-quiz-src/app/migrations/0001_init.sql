CREATE TABLE users (
  id          INTEGER PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  pass_hash   TEXT NOT NULL,
  lang        TEXT NOT NULL DEFAULT 'es',
  q_lang      TEXT NOT NULL DEFAULT 'es',
  theme       TEXT NOT NULL DEFAULT 'system',
  created_at  INTEGER NOT NULL
);

CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);

CREATE TABLE attempts (
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
CREATE INDEX attempts_user ON attempts(user_id, started_at DESC);

CREATE TABLE answers (
  attempt_id   TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  choice       TEXT NOT NULL,
  correct      INTEGER NOT NULL,
  answered_at  INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE INDEX answers_user ON answers(user_id, question_id);
CREATE INDEX answers_question ON answers(question_id);

CREATE TABLE bookmarks (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);

-- Brake on password guessing, shared by every Worker instance.
CREATE TABLE login_failures (
  email   TEXT PRIMARY KEY,
  count   INTEGER NOT NULL,
  until   INTEGER NOT NULL
);
