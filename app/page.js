'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setD); }, []);
  if (!d) return <p>Loading…</p>;
  return (<>
    <h1>Dashboard</h1>
    <div className="card"><h2>Cases per court <span className="muted">(database VIEW v_court_stats)</span></h2>
      <table><thead><tr><th>Court</th><th>Level</th><th>Total</th><th>Pending</th><th>Latest decision</th></tr></thead>
        <tbody>{d.courts.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.level}</td><td>{c.total_cases}</td><td>{c.pending_cases}</td><td>{c.latest_decision?.slice(0, 10) || '—'}</td></tr>)}</tbody></table></div>
    <div className="card"><h2>Categories with 2+ cases <span className="muted">(GROUP BY … HAVING)</span></h2>
      <table><thead><tr><th>Category</th><th>Cases</th><th>Earliest</th></tr></thead>
        <tbody>{d.categories.map(c => <tr key={c.category}><td>{c.category}</td><td>{c.n}</td><td>{c.earliest?.slice(0, 10)}</td></tr>)}</tbody></table></div>
    <div className="card"><h2>Cases cited more than their court's average <span className="muted">(correlated subquery)</span></h2>
      <table><thead><tr><th>Case</th><th>Court</th><th>Cited by</th></tr></thead>
        <tbody>{d.notable.map(c => <tr key={c.case_number}><td>{c.case_number} — {c.title}</td><td>{c.court}</td><td>{c.cited_by}</td></tr>)}</tbody></table></div>
  </>);
}
