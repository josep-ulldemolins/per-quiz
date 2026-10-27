-- One row per paid Checkout Session. expires_at NULL means the lifetime plan.
CREATE TABLE entitlements (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL,
  expires_at      INTEGER,
  payment_intent  TEXT,
  amount          INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX entitlements_user ON entitlements(user_id, expires_at);
CREATE INDEX entitlements_payment ON entitlements(payment_intent);

-- Every exam a free user starts. Kept apart from attempts so deleting a test does not give the day's quota back.
CREATE TABLE exam_starts (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  INTEGER NOT NULL
);
CREATE INDEX exam_starts_user ON exam_starts(user_id, started_at);
