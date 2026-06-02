"use client";

import Link from "next/link";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-surface px-6">
          <section className="card w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow">
              DB
            </div>
            <h1 className="text-2xl font-black text-ink">This page couldn&apos;t load.</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-neutral-600">
              Try reloading the page. If that does not work, go back home and sign in again.
            </p>
            <div className="mt-5 grid gap-3">
              <button className="btn-primary" type="button" onClick={reset}>
                Reload
              </button>
              <Link className="btn-secondary" href="/">
                Back to home
              </Link>
              <Link className="btn-secondary" href="/login">
                Log out
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
