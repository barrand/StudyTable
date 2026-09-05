"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { safeReturn } from "@/lib/session";
export default function Access() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Header />
      <main className="picker">
        <h1>A place at the table</h1>
        <p className="subtle">
          Enter the shared invite password to read and study.
        </p>
        <form
          className="access-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const password = new FormData(event.currentTarget).get("password");
            try {
              const response = await fetch("/api/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              window.location.assign(
                safeReturn(
                  new URLSearchParams(window.location.search).get("next"),
                ),
              );
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="password">Shared password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
          />
          <button className="primary" disabled={busy}>
            {busy ? "Opening…" : "Continue"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </main>
    </>
  );
}
