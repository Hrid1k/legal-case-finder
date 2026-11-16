```js
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const cats = ['property','privacy','employment','ip','consumer','environment','contract','family','criminal','medical','tax'];

export default function CaseDetail() {
  const { id } = useParams(), router = useRouter();
  const [d, setD] = useState(null), [me, setMe] = useState(null), [meta, setMeta] = useState({ lawyers: [], cases: [] });
  const [msg, setMsg] = useState(''), [lawyer, setLawyer] = useState(''), [cite, setCite] = useState('');
  const [edit, setEdit] = useState(null);
  const load = () => fetch(`/api/cases/${id}`).then(r => r.json()).then(setD);
  useEffect(() => { load(); fetch('/api/auth/me').then(r => r.json()).then(setMe); fetch('/api/meta').then(r => r.json()).then(setMeta); }, [id]);
  const post = async (url, body) => { const r = await fetch(url, { method: 'POST', body: JSON.stringify(body) }); const j = await r.json(); setMsg(r.ok ? 'Done' : j.error); if (r.ok) load(); };
  async function save(e) {
    e.preventDefault();
    const r = await fetch(`/api/cases/${id}`, { method: 'PUT', body: JSON.stringify(edit) });
    const j = await r.json(); setMsg(r.ok ? 'Done' : j.error);
    if (r.ok) { setEdit(null); load(); }
  }
  async function del() { if (!confirm('Delete this case?')) return; await fetch(`/api/cases/${id}`, { method: 'DELETE' }); router.push('/cases'); }
  if (!d) return <p>Loading…</p>; if (d.error) return <p>{d.error}</p>;
  const c = d.case, admin = me?.role === 'admin';
  return (<>
    <h1>{c.title}</h1>
    <div className="card">
      <p><b>{c.case_number}</b> · {c.court} · {c.judge || 'Judge n/a'} · <span className="badge">{c.category}</span> · <span className="badge">{c.status}</span> · {c.decided_on?.slice(0, 10)}</p>
      <p>{c.summary}</p><p className="muted">Cited by {c.cited_by} case(s)</p>
      {admin && <div className="row">
        <button style={{ flex: 'none' }} onClick={() => setEdit({ ...c, judge_id: c.judge_id || '', decided_on: c.decided_on || '' })}>Edit case</button>
        <button className="danger" style={{ flex: 'none' }} onClick={del}>Delete case</button></div>}
    </div>
    {edit && <div className="card"><h2>Edit case <span className="muted">(UPDATE case + re-embed vector in one transaction)</span></h2>
      <form onSubmit={save}>
        <div className="row"><input style={{ flex: 3 }} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} required /></div>
        <div className="row">
          <select value={edit.court_id} onChange={e => setEdit({ ...edit, court_id: e.target.value, judge_id: '' })}>{meta.courts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select value={edit.judge_id} onChange={e => setEdit({ ...edit, judge_id: e.target.value })}><option value="">Judge…</option>{meta.judges.filter(j => j.court_id == edit.court_id).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select>
          <select value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })}>{cats.map(x => <option key={x}>{x}</option>)}</select>
          <select value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}><option>decided</option><option>pending</option><option>appealed</option></select>
          <input type="date" value={edit.decided_on} onChange={e => setEdit({ ...edit, decided_on: e.target.value })} />
        </div>
        <textarea value={edit.summary} onChange={e => setEdit({ ...edit, summary: e.target.value })} required />
        <div className="row" style={{ marginTop: 8 }}><button style={{ flex: 'none' }}>Save changes</button>
          <button type="button" className="sec" style={{ flex: 'none' }} onClick={() => setEdit(null)}>Cancel</button></div>
      </form></div>}
    <div className="card"><h2>Citation chain <span className="muted">(recursive CTE – cases this case relies on, up to 5 levels)</span></h2>
      {d.citations.length ? <table><tbody>{d.citations.map(x => <tr key={x.id}><td>Level {x.depth}</td><td><Link href={`/cases/${x.id}`}>{x.case_number}</Link> — {x.title}</td></tr>)}</tbody></table> : <p className="muted">Cites no other cases.</p>}
      {admin && <div className="row" style={{ marginTop: 10 }}>
        <select value={cite} onChange={e => setCite(e.target.value)}><option value="">Add a cited case…</option>{meta.cases.filter(x => x.id != id).map(x => <option key={x.id} value={x.id}>{x.case_number}</option>)}</select>
        <button style={{ flex: 'none' }} onClick={() => post('/api/citations', { citing: Number(id), cited: Number(cite) })}>Add citation</button></div>}
    </div>
    <div className="card"><h2>Similar cases <span className="muted">(vector nearest neighbours)</span></h2>
      <table><tbody>{d.similar.map(x => <tr key={x.id}><td><Link href={`/cases/${x.id}`}>{x.case_number}</Link> — {x.title}</td><td>{(x.similarity * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
    {admin && <div className="card"><h2>Assign to lawyer <span className="muted">(calls stored procedure assign_case)</span></h2>
      <div className="row"><select value={lawyer} onChange={e => setLawyer(e.target.value)}><option value="">Select lawyer…</option>{meta.lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <button style={{ flex: 'none' }} onClick={() => post('/api/assignments', { case_id: Number(id), lawyer_id: Number(lawyer) })}>Assign</button></div></div>}
    {msg && <div className={msg === 'Done' ? 'ok' : 'err'}>{msg}</div>}
  </>);
}
```