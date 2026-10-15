-- Additive and repeatable. Contains no plaintext health data or encryption keys.
CREATE TABLE IF NOT EXISTS tezisce_vaults (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), payload TEXT NOT NULL CHECK(length(payload)<=1500000), updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tezisce_history (vault_id TEXT NOT NULL REFERENCES tezisce_vaults(id), revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(vault_id,revision));
