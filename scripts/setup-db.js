import fs from 'node:fs';
import { pool } from '../lib/db.js';

for (const f of ['01_schema.sql', '02_advanced.sql', '03_roles.sql']) {
  console.log('Running', f);
  await pool.query(fs.readFileSync(new URL(`../db/${f}`, import.meta.url), 'utf8'));
}
console.log('Database ready.');
await pool.end();
