// Schema for D1 database
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS sync_groups (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_updated INTEGER NOT NULL
);`;

export const DEVICES_SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  sync_group_id TEXT NOT NULL,
  last_sync INTEGER NOT NULL,
  FOREIGN KEY(sync_group_id) REFERENCES sync_groups(id)
);`;
