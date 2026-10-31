'use client';
import { useEffect, useState } from 'react';

const blank = { case_number: '', title: '', court_id: '', judge_id: '', category: 'property', status: 'decided', decided_on: '', summary: '' };
const cats = ['property','privacy','employment','ip','consumer','environment','contract','family','criminal','medical','tax'];

export default function Admin() {
  const [f, setF] = useState(blank), [meta, setMeta] = useState({ courts: [], judges: [] });
  const [audit, setAudit] = useState([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const loadAudit = () => fetch("/api/audit").then(r => r.ok ? r.json() : []).then(setAudit);
  useEffect(() => { fetch('/api/meta').then(r => r.json()).then(setMeta); loadAudit(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setMsg(''); setBusy(true);
    const r = await fetch('/api/cases', { method: 'POST', body: JSON.stringify(f) });
    const j = await r.json(); setBusy(false);
    if (r.ok) { setMsg('Case created and embedded'); setF(blank); loadAudit(); } else setMsg('Error: ' + j.error);
  }
  return (<>
    <h1>Admin</h1>
    <div className="card"><h2>Add a case <span className="muted">(INSERT case + vector embedding in one transaction)</span></h2>
      <form onSubmit={submit}>
        <div className="row"><input placeholder="Case number" value={f.case_number} onChange={set('case_number')} required />
          <input style={{ flex: 3 }} placeholder="Title" value={f.title} onChange={set('title')} required /></div>
        <div className="row">
          <select value={f.court_id} onChange={set('court_id')} required><option value="">Court…</option>{meta.courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={f.judge_id} onChange={set('judge_id')}><option value="">Judge…</option>{meta.judges.filter(j => j.court_id == f.court_id).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select>
          <select value={f.category} onChange={set('category')}>{cats.map(c => <option key={c}>{c}</option>)}</select>
          <select value={f.status} onChange={set('status')}><option>decided</option><option>pending</option><option>appealed</option></select>
          <input type="date" value={f.decided_on} onChange={set('decided_on')} />
        </div>
        <textarea placeholder="Summary (min 30 characters)" value={f.summary} onChange={set('summary')} required />
        <div className="row" style={{ marginTop: 8 }}><button disabled={busy} style={{ flex: 'none' }}>{busy ? 'Saving…' : 'Create case'}</button></div>
        {msg && <div className={msg.startsWith('Error') ? 'err' : 'ok'}>{msg}</div>}
      </form></div>
    <div className="card"><h2>Audit log <span className="muted">(written by database triggers)</span></h2>
      <table><thead><tr><th>When</th><th>Who</th><th>Table</th><th>Action</th><th>Record</th></tr></thead>
        <tbody>{audit.map(a => <tr key={a.id}><td>{new Date(a.changed_at).toLocaleString()}</td><td>{a.user_name || '—'}</td><td>{a.table_name}</td><td>{a.action}</td><td>{a.details?.case_number || `#${a.record_id}`}</td></tr>)}</tbody></table></div>
  </>);
}
