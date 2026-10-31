import pg from 'pg';

// Credentials come ONLY from environment variables.
const pool = globalThis.__pgPool || new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalThis.__pgPool = pool;

/**
 * Run fn(client) inside a transaction. If a session is given, the transaction
 * switches to the matching DB role (database-level RBAC + RLS) and records the
 * user id so audit triggers / RLS policies can read it.
 */
export async function tx(session, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (session) {
      const role = session.role === 'admin' ? 'legal_admin' : 'legal_lawyer';
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(session.id)]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const query = (text, params, session) =>
  session ? tx(session, (c) => c.query(text, params)) : pool.query(text, params);

export { pool };
