"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { findBook } from "@/lib/books";
export default function Resume() {
  const [last, setLast] = useState<{ url: string; label: string } | null>(null);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem("study-last") ?? "null"),
        book = value && findBook(value.book);
      if (
        book &&
        Number.isInteger(value.chapter) &&
        value.chapter > 0 &&
        value.chapter <= book.chapters
      )
        setLast({
          url: `/bible/${book.slug}/${value.chapter}`,
          label: `${book.name} ${value.chapter}`,
        });
    } catch {}
  }, []);
  return last ? (
    <p className="subtle" style={{ marginTop: 24 }}>
      <Link href={last.url}>Continue reading {last.label} →</Link>
    </p>
  ) : null;
}
