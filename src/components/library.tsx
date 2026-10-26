import Link from 'next/link';

export function Header({ title, back }: { title: string; back?: string }) {
  return <header className="topbar"><div>{back && <Link className="icon-button" href={back} aria-label="Go back">‹</Link>}</div><Link className="brand" href="/">{title}</Link><div /></header>;
}
export function Library({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main id="main" className="library"><h1>{title}</h1><p className="muted intro">{description}</p>{children}</main>;
}
