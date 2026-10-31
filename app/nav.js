'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function Nav() {
  const [me, setMe] = useState(null);
  const path = usePathname(), router = useRouter();
  useEffect(() => { fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setMe); }, [path]);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); setMe(null); router.push('/login'); }
  return (
    <nav>
      <b>⚖ Legal Case Finder</b>
      {me && <>
        <Link href="/">Dashboard</Link><Link href="/cases">Search cases</Link>
        <Link href="/assignments">{me.role === 'admin' ? 'Assignments' : 'My cases'}</Link>
        {me.role === 'admin' && <Link href="/admin">Admin</Link>}
        <span className="sp" /><span>{me.name} <span className="badge" style={{color:'#1c2330'}}>{me.role}</span></span>
        <button className="sec" onClick={logout}>Logout</button>
      </>}
    </nav>
  );
}
