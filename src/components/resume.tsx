'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Resume() {
  const [last, setLast] = useState<{ url: string; label: string } | null>(null);
  useEffect(() => { try {
    const value = JSON.parse(localStorage.getItem('study-table:last-read') || 'null');
    if (value && typeof value.url === 'string' && /^\/bible\/[a-z0-9-]+\/\d+(?:\?[^#]*)?$/.test(value.url) && typeof value.label === 'string') setLast(value);
  } catch { /* Storage is optional. */ } }, []);
  return last ? <Link className="resume" href={last.url}>Continue reading <strong>{last.label}</strong><span aria-hidden="true"> →</span></Link> : null;
}
