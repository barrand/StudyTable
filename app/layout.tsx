import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Study Table", template: "%s · Study Table" },
  description: "A quiet place to read scripture and explore its context.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
