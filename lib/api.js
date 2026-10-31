import { getSession } from './session.js';

/** Auth + role guard. Returns { s } (session) or { res } (error response). */
export async function guard(roles) {
  const s = await getSession();
  if (!s) return { res: Response.json({ error: 'Not logged in' }, { status: 401 }) };
  if (roles && !roles.includes(s.role))
    return { res: Response.json({ error: 'Forbidden for your role' }, { status: 403 }) };
  return { s };
}

/** Wrap a handler: Postgres constraint / trigger errors become clean 4xx responses. */
export const handle = (fn) => async (req, ctx) => {
  try { return await fn(req, ctx); }
  catch (e) {
    console.error(e);
    const c = String(e.code || '');
    const status = c.startsWith('23') || c === 'P0001' ? 400 : c === '42501' ? 403 : 500;
    return Response.json({ error: status === 500 ? 'Server error' : e.message }, { status });
  }
};

export const toVec = (arr) => '[' + arr.join(',') + ']';
