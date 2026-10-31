'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Cases() {
  const [mode, setMode] = useState('keyword');
  const [q, setQ] = useState(''), [court, setCourt] = useState(''), [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [meta, setMeta] = useState({ courts: [] });
  const [rows, setRows] = useState([]), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const cats = ['property','privacy','employment','ip','consumer','environment','contract','family','criminal','medical','tax'];

  useEffect(() => { fetch('/api/meta').then(r => r.json()).then(setMeta); }, []);
  async function run(e) {
    e?.preventDefault(); setErr(''); setBusy(true);
    let r;
    if (mode === 'keyword') {
      const p = new URLSearchParams();
if (q) p.set('q', q);
if (court) p.set('court', court);
if (category) p.set('category', category);
if (status) p.set('status', status);
      r = await fetch('/api/cases?' + p);
    } else {
      r = await fetch('/api/search/semantic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: q, category, status })
});
    }
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setErr(j.error); setRows([]); } else setRows(j);
  }
  useEffect(() => { if (mode === 'keyword') run(); else setRows([]); }, [mode]); // eslint-disable-line

  return (<>
    <h1>Search cases</h1>
    <div className="card">
      <div className="tabs">
        <button className={mode === 'keyword' ? '' : 'sec'} onClick={() => setMode('keyword')}>Keyword (full-text)</button>
        <button className={mode === 'semantic' ? '' : 'sec'} onClick={() => setMode('semantic')}>Semantic (vector)</button>
      </div>
      <form onSubmit={run}>
        <div className="row">
          <input style={{ flex: 3 }} value={q} onChange={e => setQ(e.target.value)}
            placeholder={mode === 'keyword' ? 'e.g. eviction notice' : 'Describe the situation in plain words, e.g. "my employer fired me for complaining"'} />
          {mode === 'keyword' && <select value={court} onChange={e => setCourt(e.target.value)}><option value="">All courts</option>
            {meta.courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>
            {cats.map(c => <option key={c}>{c}</option>)}</select>
            <select value={status} onChange={e => setStatus(e.target.value)}>
  <option value="">All statuses</option>
  <option value="pending">Pending</option>
  <option value="decided">Decided</option>
  <option value="appealed">Appealed</option>
</select>
          <button disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
        </div>
      </form>
      {err && <div className="err">{err}</div>}
      {mode === 'semantic' && <p className="muted">Ranked by cosine similarity between the query embedding and each case embedding (pgvector).</p>}
    </div>
    <div className="card"><table>
      <thead><tr><th>Case</th><th>Court</th><th>Category</th><th>Decided</th><th>Cited by</th>{mode === 'semantic' && <th>Similarity</th>}</tr></thead>
      <tbody>{rows.map(c => <tr key={c.id}>
        <td><Link href={`/cases/${c.id}`}>{c.case_number}</Link> — {c.title}</td><td>{c.court}</td>
        <td><span className="badge">{c.category}</span></td><td>{c.decided_on?.slice(0, 10) || c.status}</td><td>{c.cited_by}</td>
        {mode === 'semantic' && <td>{(c.similarity * 100).toFixed(1)}%</td>}</tr>)}</tbody></table>
      {!rows.length && <p className="muted">No results.</p>}</div>
  </>);
}
