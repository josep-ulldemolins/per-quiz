-- Test user for the local development database only (password in the README).
INSERT OR IGNORE INTO users (email, name, pass_hash, lang, q_lang, created_at)
VALUES ('demo@per-quiz.test', 'Demo', 'pbkdf2$100000$kwZzOWDPzyLrwSmR07NdJw==$BSQNE2SJRyxVhI6xv4ayoePDcN5jVz+m7+vp+bj1qJE=', 'es', 'es', 1793059200000);
