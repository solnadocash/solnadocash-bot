import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';

const db = new Database('transfers.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    tg_user_id INTEGER,
    tg_username TEXT,
    amount REAL,
    recipient TEXT,
    temp_address TEXT,
    temp_secret TEXT,
    status TEXT DEFAULT 'pending',
    deposit_tx TEXT,
    withdraw_tx TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

export interface Transfer {
  id: string;
  tgUserId: number;
  tgUserName: string;
  amount: number;
  recipient: string;
  tempAddress: string;
  tempSecret: string;
  status: string;
  depositTx?: string;
  withdrawTx?: string;
  createdAt: number;
  updatedAt: number;
}

interface CreateTransferParams {
  tgUserId: number;
  tgUserName: string;
  amount: number;
  recipient: string;
  tempAddress: string;
  tempSecret: string;
  status: string;
}

export function createTransfer(params: CreateTransferParams): string {
  const id = randomBytes(6).toString('hex');
  
  db.prepare(`
    INSERT INTO transfers (id, tg_user_id, tg_username, amount, recipient, temp_address, temp_secret, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.tgUserId,
    params.tgUserName,
    params.amount,
    params.recipient,
    params.tempAddress,
    params.tempSecret,
    params.status
  );

  return id;
}

export function getTransfer(id: string): Transfer | null {
  const row = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any;
  if (!row) return null;
  
  return {
    id: row.id,
    tgUserId: row.tg_user_id,
    tgUserName: row.tg_username,
    amount: row.amount,
    recipient: row.recipient,
    tempAddress: row.temp_address,
    tempSecret: row.temp_secret,
    status: row.status,
    depositTx: row.deposit_tx,
    withdrawTx: row.withdraw_tx,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getPendingTransfers(): Transfer[] {
  const rows = db.prepare(
    "SELECT * FROM transfers WHERE status = 'pending' AND created_at > strftime('%s', 'now') - 1800"
  ).all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    tgUserId: row.tg_user_id,
    tgUserName: row.tg_username,
    amount: row.amount,
    recipient: row.recipient,
    tempAddress: row.temp_address,
    tempSecret: row.temp_secret,
    status: row.status,
    depositTx: row.deposit_tx,
    withdrawTx: row.withdraw_tx,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function updateTransferStatus(id: string, status: string, tx?: { deposit?: string; withdraw?: string }) {
  if (tx?.deposit) {
    db.prepare("UPDATE transfers SET status = ?, deposit_tx = ?, updated_at = strftime('%s', 'now') WHERE id = ?")
      .run(status, tx.deposit, id);
  } else if (tx?.withdraw) {
    db.prepare("UPDATE transfers SET status = ?, withdraw_tx = ?, updated_at = strftime('%s', 'now') WHERE id = ?")
      .run(status, tx.withdraw, id);
  } else {
    db.prepare("UPDATE transfers SET status = ?, updated_at = strftime('%s', 'now') WHERE id = ?")
      .run(status, id);
  }
}

export function expireOldTransfers() {
  db.prepare(
    "UPDATE transfers SET status = 'expired' WHERE status = 'pending' AND created_at < strftime('%s', 'now') - 1800"
  ).run();
}

