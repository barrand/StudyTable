"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="picker">
      <h1>Something interrupted your reading</h1>
      <p className="subtle">Please try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
