'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Assignments() {
  const [rows, setRows] = useState([]), [me, setMe] = useState(null), [err, setErr] = useState('');
  const load = () => fetch('/api/assignments').then(r => r.json()).then(setRows);
  useEffect(() => { load(); fetch('/api/auth/me').then(r => r.json()).then(setMe); }, []);
  async function setStatus(id, status) {
    const r = await fetch(`/api/assignments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!r.ok) setErr((await r.json()).error); else load();
  }
  const admin = me?.role === 'admin';
  return (<>
    <h1>{admin ? 'All assignments' : 'My assigned cases'}</h1>
    {err && <div className="err">{err}</div>}
    <div className="card"><table>
      <thead><tr><th>Case</th>{admin && <th>Lawyer</th>}<th>Assigned</th><th>Status</th><th></th></tr></thead>
      <tbody>{rows.map(a => <tr key={a.id}>
        <td><Link href={`/cases/${a.case_id}`}>{a.case_number}</Link> — {a.title}</td>{admin && <td>{a.lawyer}</td>}
        <td>{a.assigned_at.slice(0, 10)}</td><td><span className="badge">{a.status}</span></td>
        <td>{a.status === 'active' ? <button onClick={() => setStatus(a.id, 'completed')}>Mark completed</button>
              : <button className="sec" onClick={() => setStatus(a.id, 'active')}>Reopen</button>}</td></tr>)}</tbody></table>
      {!rows.length && <p className="muted">Nothing assigned.</p>}</div>
  </>);
}
