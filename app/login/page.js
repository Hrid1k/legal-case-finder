'use client';
import { useState } from 'react';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    const r = await fetch(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(f) });
    if (r.ok) window.location.href = '/'; else setErr((await r.json()).error);
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="card" style={{ maxWidth: 380, margin: '60px auto' }}>
      <h1>{mode === 'login' ? 'Sign in' : 'Create lawyer account'}</h1>
      <form onSubmit={submit}>
        {mode === 'register' && <div className="row"><input placeholder="Full name" value={f.name} onChange={set('name')} required /></div>}
        <div className="row"><input type="email" placeholder="Email" value={f.email} onChange={set('email')} required /></div>
        <div className="row"><input type="password" placeholder="Password (8+ chars)" value={f.password} onChange={set('password')} required /></div>
        {err && <div className="err">{err}</div>}
        <button style={{ width: '100%' }}>{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <p className="muted" style={{ cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New lawyer? Register' : 'Have an account? Login'}
      </p>
    </div>
  );
}
