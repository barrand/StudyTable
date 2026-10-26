'use client';
export default function ErrorPage({reset}:{reset:()=>void}) { return <main id="main" className="library"><h1>Something interrupted your reading</h1><p className="muted">Please try again.</p><button onClick={reset}>Try again</button></main>; }
