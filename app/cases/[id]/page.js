
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const cats = [
  'property', 'privacy', 'employment', 'ip', 'consumer',
  'environment', 'contract', 'family', 'criminal', 'medical', 'tax'
];

export default function CaseDetail() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();

  const [d, setD] = useState(null);
  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState({
    lawyers: [],
    cases: [],
    courts: [],
    judges: []
  });

  const [msg, setMsg] = useState('');
  const [lawyer, setLawyer] = useState('');
  const [cite, setCite] = useState('');
  const [edit, setEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const r = await fetch(`/api/cases/${id}`);
      const j = await r.json();

      if (!r.ok) throw new Error(j.error || 'Failed to load case');

      setD(j);
    } catch (err) {
      setD({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    load();

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(setMe)
      .catch(console.error);

    fetch('/api/meta')
      .then(r => r.json())
      .then(j => setMeta({
        lawyers: j.lawyers || [],
        cases: j.cases || [],
        courts: j.courts || [],
        judges: j.judges || []
      }))
      .catch(console.error);
  }, [id]);

  const post = async (url, body) => {
    try {
      setMsg('');

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const j = await r.json();

      if (!r.ok) throw new Error(j.error || 'Request failed');

      setMsg('Done');
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setMsg('');

      const r = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit)
      });

      const j = await r.json();

      if (!r.ok) throw new Error(j.error || 'Update failed');

      setMsg('Done');
      setEdit(null);
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm('Delete this case?')) return;

    try {
      const r = await fetch(`/api/cases/${id}`, {
        method: 'DELETE'
      });

      const j = await r.json();

      if (!r.ok) throw new Error(j.error || 'Delete failed');

      router.push('/cases');
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!d) return <p>Unable to load case.</p>;
  if (d.error) return <p>{d.error}</p>;

  const c = d.case;
  const admin = me?.role === 'admin';

  if (!c) return <p>Case not found.</p>;

  return (
    <>
      <h1>{c.title}</h1>

      <div className="card">
        <p>
          <b>{c.case_number}</b> · {c.court} ·
          {c.judge || 'Judge n/a'} ·
          <span className="badge">{c.category}</span> ·
          <span className="badge">{c.status}</span> ·
          {c.decided_on?.slice(0, 10)}
        </p>

        <p>{c.summary}</p>

        <p className="muted">
          Cited by {c.cited_by ?? 0} case(s)
        </p>

        {admin && (
          <div className="row">
            <button
              style={{ flex: 'none' }}
              onClick={() => setEdit({
                ...c,
                judge_id: c.judge_id || '',
                decided_on: c.decided_on?.slice(0, 10) || ''
              })}
            >
              Edit case
            </button>

            <button
              className="danger"
              style={{ flex: 'none' }}
              onClick={del}
            >
              Delete case
            </button>
          </div>
        )}
      </div>

      {edit && (
        <div className="card">
          <h2>
            Edit case
            <span className="muted">
              (UPDATE case + re-embed vector in one transaction)
            </span>
          </h2>

          <form onSubmit={save}>
            <div className="row">
              <input
                style={{ flex: 3 }}
                value={edit.title || ''}
                onChange={e =>
                  setEdit({ ...edit, title: e.target.value })
                }
                required
              />
            </div>

            <div className="row">
              <select
                value={edit.court_id || ''}
                onChange={e =>
                  setEdit({
                    ...edit,
                    court_id: e.target.value,
                    judge_id: ''
                  })
                }
                required
              >
                {meta.courts.map(x => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>

              <select
                value={edit.judge_id || ''}
                onChange={e =>
                  setEdit({ ...edit, judge_id: e.target.value })
                }
              >
                <option value="">Judge...</option>

                {meta.judges
                  .filter(j => j.court_id == edit.court_id)
                  .map(j => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
              </select>

              <select
                value={edit.category || ''}
                onChange={e =>
                  setEdit({ ...edit, category: e.target.value })
                }
              >
                {cats.map(x => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>

              <select
                value={edit.status || 'decided'}
                onChange={e =>
                  setEdit({ ...edit, status: e.target.value })
                }
              >
                <option value="decided">decided</option>
                <option value="pending">pending</option>
                <option value="appealed">appealed</option>
              </select>

              <input
                type="date"
                value={edit.decided_on || ''}
                onChange={e =>
                  setEdit({ ...edit, decided_on: e.target.value })
                }
              />
            </div>

            <textarea
              value={edit.summary || ''}
              onChange={e =>
                setEdit({ ...edit, summary: e.target.value })
              }
              required
            />

            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 'none' }}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              <button
                type="button"
                className="sec"
                style={{ flex: 'none' }}
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>
          Citation chain
          <span className="muted">
            (recursive CTE – cases this case relies on, up to 5 levels)
          </span>
        </h2>

        {d.citations?.length ? (
          <table>
            <tbody>
              {d.citations.map(x => (
                <tr key={x.id}>
                  <td>Level {x.depth}</td>
                  <td>
                    <Link href={`/cases/${x.id}`}>
                      {x.case_number}
                    </Link>
                    {' — '}
                    {x.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Cites no other cases.</p>
        )}

        {admin && (
          <div className="row" style={{ marginTop: 10 }}>
            <select
              value={cite}
              onChange={e => setCite(e.target.value)}
            >
              <option value="">Add a cited case...</option>

              {meta.cases
                .filter(x => x.id != id)
                .map(x => (
                  <option key={x.id} value={x.id}>
                    {x.case_number}
                  </option>
                ))}
            </select>

            <button
              style={{ flex: 'none' }}
              disabled={!cite}
              onClick={() => {
                post('/api/citations', {
                  citing: Number(id),
                  cited: Number(cite)
                });
                setCite('');
              }}
            >
              Add citation
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>
          Similar cases
          <span className="muted">(vector nearest neighbours)</span>
        </h2>

        {d.similar?.length ? (
          <table>
            <tbody>
              {d.similar.map(x => (
                <tr key={x.id}>
                  <td>
                    <Link href={`/cases/${x.id}`}>
                      {x.case_number}
                    </Link>
                    {' — '}
                    {x.title}
                  </td>
                  <td>
                    {(x.similarity * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No similar cases found.</p>
        )}
      </div>

      {admin && (
        <div className="card">
          <h2>
            Assign to lawyer
            <span className="muted">
              (calls stored procedure assign_case)
            </span>
          </h2>

          <div className="row">
            <select
              value={lawyer}
              onChange={e => setLawyer(e.target.value)}
            >
              <option value="">Select lawyer...</option>

              {meta.lawyers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              style={{ flex: 'none' }}
              disabled={!lawyer}
              onClick={() => {
                post('/api/assignments', {
                  case_id: Number(id),
                  lawyer_id: Number(lawyer)
                });
                setLawyer('');
              }}
            >
              Assign
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={msg === 'Done' ? 'ok' : 'err'}>
          {msg}
        </div>
      )}
    </>
  );
}
