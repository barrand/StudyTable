import Link from "next/link";
export function Header({
  title,
  back,
  backLabel = "Go back",
  children,
}: {
  title?: string;
  back?: string;
  backLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      {back && (
        <Link className="icon" href={back} aria-label={backLabel}>
          ‹
        </Link>
      )}
      <div className="brand">
        {title ?? (
          <>
            Study <span>Table</span>
          </>
        )}
      </div>
      {children}
    </header>
  );
}
