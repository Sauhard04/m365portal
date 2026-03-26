import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let dbPromise: Promise<any> | null = null;

async function getDb() {
    if (!dbPromise) {
        const dbPath = path.join(process.cwd(), 'data', 'exchange-audit.db');
        // Ensure data dir exists
        const fs = await import('fs');
        if (!fs.existsSync(path.dirname(dbPath))) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }

        dbPromise = open({ filename: dbPath, driver: sqlite3.Database });
        const db = await dbPromise;
        await db.run(`CREATE TABLE IF NOT EXISTS exchange_audit (id TEXT PRIMARY KEY, jobId TEXT, action TEXT, status TEXT, details TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        return db;
    }
    return dbPromise;
}

export async function createAudit(record: { id?: string; jobId: string; action: string; status: string; details?: string }) {
    const db = await getDb();
    const id = record.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await db.run('INSERT INTO exchange_audit (id, jobId, action, status, details) VALUES (?, ?, ?, ?, ?)', [id, record.jobId, record.action, record.status, record.details || '']);
    return { id, jobId: record.jobId };
}

export async function listAudits(limit = 50) {
    const db = await getDb();
    return await db.all('SELECT * FROM exchange_audit ORDER BY createdAt DESC LIMIT ?', [limit]);
}
